var Chart = function() {
	
	var margin, 
		width, height,
		x, y,
		xAxis, xAxis2, yAxis,
		startDomain,
		startDate,
		startWeek,
		brush,
		svg,
		focus,
		context,
		bar,
		barWidth,
		dateRange;
	
	var customTimeFormat = function (date) {

		var	formatWeek = d3.timeFormat("%-d"),
			formatMonth = d3.timeFormat("%b"),
			formatYear = d3.timeFormat("%Y");

		return (d3.timeMonth(date) <= date ? formatWeek
		: d3.timeYear(date) <= date ? formatMonth
		: formatYear)(date);

	}
	
	var customTimeFormat2 = function (date) {

		var	formatMonth = d3.timeFormat("%b"),
			formatYear = d3.timeFormat("%Y");

		return (d3.timeYear(date) <= date ? formatMonth: formatYear)(date);

	}
	
	var updateWeekDisplay = function(week) {

		var dateFmt = d3.timeFormat("%Y/%m/%d");
		setSubtitle("Week: " + dateFmt(week[0]) + " - " + dateFmt(week[1]));

	}
	
	var brushmove = function() {

		var currentDate;
		
		if (!d3.event.sourceEvent || d3.event.sourceEvent.type === "brush") {
			return;
		}

		currentSelection = d3.event.selection.map(x.invert);
		currentWeek = [d3.timeWeek.floor(currentSelection[0]), d3.timeWeek.ceil(currentSelection[0])];

		if (currentSelection[0] < currentWeek[0]) {
			currentWeek = [d3.timeWeek.floor(currentSelection[0]), d3.timeWeek.ceil(currentSelection[0])];
		} else if (currentSelection[1] > currentWeek[1]) {
			currentWeek = [d3.timeWeek.floor(currentSelection[1]), d3.timeWeek.ceil(currentSelection[1])];
		}

		d3.select(this).call(brush.move, currentWeek.map(x));

		updateWeekDisplay(currentWeek);

	}

	var brushend = function(renderMap) {

		var dateFmt = d3.timeFormat("%Y-%m-%d");

		if (typeof currentWeek !== "undefined") {
			renderMap([dateFmt(currentWeek[0]), dateFmt(currentWeek[1])]);
		}

	}
	
	var setSubtitle = function(subTitle) {
		$('.precipitation_subtitle').html(subTitle);
	}

	var setTitle = function(title) {
		$('.precipitation').html(title);
	}

	var adjustTextLabels = function(selection) {
		selection.selectAll('.axis2 text')
		.attr('transform', 'translate(' + 35 + ',0)');
		//.attr('transform', 'translate(' + daysToPixels(1) / 2 + ',0)');
	}

	var sameDay = function(date) {
		return date[0].getDay() === 0 && (date[0].toString() == date[1].toString());
	}

	var nWeeks = function(dateRange) {
		return d3.timeWeek.count(new Date(dateRange[0]), new Date(dateRange[1]))
	}

	/*
	function daysToPixels(days, timeScale) {
	 	var d1 = new Date();
	 	timeScale || (timeScale = Global.timeScale);
		return timeScale(d3.timeWeek.offset(d1, days)) - timeScale(d1);
	}
	*/

	var initialize = function(dateRange) {

		var dateFmt = d3.timeFormat("%Y/%m/%d");
		
        // init margins
        margin = {left: 40, right: 20}

        // init width and height
        width = 900 - margin.left - margin.right;
        height = 50;

        // init x and y scales
        x = d3.scaleTime().rangeRound([0, width]);
        y = d3.scaleLinear().range([height, 0]);

        // init x axes and ticks
		xAxis = d3.axisBottom(x)
		.tickFormat(customTimeFormat)
		.ticks(nWeeks(dateRange));
		xAxis2 = d3.axisBottom(x)
		.tickFormat(customTimeFormat2);

		// init y axes and ticks
		yAxis = d3.axisLeft(y).ticks(3);
		yAxis2 = d3.axisRight(y).ticks(3);

  		// set title
		setTitle("Precipitation: " + dateFmt(new Date(dateRange[0])) + " - " + dateFmt(new Date(dateRange[1])));

		// add svg viewport
		svg = d3.select("#chart").append("svg")
		.attr("width", "800")
		.attr("height", 90)
		.attr("viewBox", "0 0 900 90")
		.attr("preserveAspectRatio", "none");

		// add context (the chart container)
		context = svg.append("g")
		.attr("class", "context")
		.attr("transform", "translate(" + margin.left + "," + 0 + ")");

	}

	var render = function(data, renderMap, initialDates) {

		var bar, dateFmt;

		// set domains: x is min to max date, y is 0 to max precip
		x.domain(d3.extent(data.map(function(d) { return new Date(d.date); })));
		y.domain([0, d3.max(data.map(function(d) { return d.value; }))]);

		// render y axis
		context.append("g")
		.attr("class", "y axis")
		.call(yAxis);

		// render y2 axis
		context.append("g")
		.attr("class", "y axis2")
		.attr("transform", "translate(" + width + ",0)")
		.call(yAxis2);

		// render x axis
		context.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis);

		// render x axis 2
		context.append("g")
		.attr("class", "x axis2")
		.attr("transform", "translate(0," + (height + 12) + ")")
		.call(xAxis2)
		.call(adjustTextLabels);

		var padding = -50;
		context.append("text")
		.attr("class", "x title")
		.attr("text-anchor", "middle")
		.attr("transform", "translate("+ (padding/2) +","+(height/2)+")rotate(-90)")
		.text("Precip (in.)");

		// get bar width
		barWidth = width / data.length;

		// render bars
		bar = context.selectAll("rect")
		.data(data)
		.enter()
		.append("rect")
		.attr("transform", function(d, i) { 
			return "translate(" + i * barWidth + ",0)"; 
		})
		.attr("class", "bar")
		.attr("y", function(d) { return y(d.value); })
		.attr("height", function(d) { 
			return height - y(d.value); 
		})
		.attr("width", barWidth - 1);

		// init brush
		brush = d3.brushX()
		.extent([ [0, 0], [width, height] ])
		.on("brush", brushmove)
		.on("end", function() { 
			brushend(renderMap);
		});

		// if the default selected date falls at the beginning of the week,
		// then d3 will make start and end dates both be that date;
		// so push the end date out 1 week to prevent that edge case.
		if (sameDay(initialDates)) {
			initialDates[1] = d3.timeWeek.offset(initialDates[1], 1);
		}

		// init brush group and set initial brush 
		var brushG = context.append("g")
		.attr("class", "brush")
		.call(brush)
		.call(brush.move, initialDates.map(x));

		// remove handles to lock the brush at a week
		d3.selectAll("g.brush rect.handle").remove();
		
	}

	return {
		initialize: initialize,
		updateWeekDisplay: updateWeekDisplay,
		render: render
	}

};

