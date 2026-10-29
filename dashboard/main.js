/*
==================================================
LOAD SHARED DATA
==================================================

Visuals 1 and 2 currently use merged_data.csv.

Teammates may:
1. Use cleanData if their visual needs the same data.
2. Load another CSV inside their own visual section.
*/

d3.csv("merged_data.csv").then(data => {

    /*
    ==============================================
    SHARED DATA CLEANING
    ==============================================
    */

    data.forEach(d => {

        d.Year = +d.Year;

        d.female_life_expectancy =
            +d.female_life_expectancy;

        d.male_life_expectancy =
            +d.male_life_expectancy;

        d.population_65_plus =
            +d.population_65_plus;

        // Calculated in JavaScript.
        // Does NOT need to exist in merged_data.csv.
        d.life_expectancy_gap =
            d.female_life_expectancy -
            d.male_life_expectancy;
    });


    const cleanData = data.filter(d =>
        Number.isFinite(d.Year) &&
        Number.isFinite(d.female_life_expectancy) &&
        Number.isFinite(d.male_life_expectancy) &&
        Number.isFinite(d.population_65_plus)
    );


    /*
    ==============================================
    SHARED YEAR VARIABLES
    ==============================================
    */

    const availableYears = Array.from(
        new Set(cleanData.map(d => d.Year))
    ).sort((a, b) => a - b);


    const minimumYear = d3.min(availableYears);

    const maximumYear = d3.max(availableYears);


    let selectedYear =
        availableYears.includes(2019)
            ? 2019
            : maximumYear;


    let selectedGender = "both";

    let animationTimer = null;


    /*
    ==============================================
    SHARED HTML CONTROLS
    ==============================================
    */

    const slider =
        d3.select("#year-slider");

    const selectedYearText =
        d3.select("#selected-year");

    const playButton =
        d3.select("#play-button");

    const tooltip =
        d3.select("#tooltip");

    const genderButtons =
        d3.selectAll(".gender-button");


    slider
        .attr("min", minimumYear)
        .attr("max", maximumYear)
        .property("value", selectedYear);


    d3.select("#minimum-year")
        .text(minimumYear);

    d3.select("#maximum-year")
        .text(maximumYear);

    selectedYearText
        .text(selectedYear);


    /*
    ==============================================
    SHARED TOOLTIP
    ==============================================
    */

    function showTooltip(event, d, type) {

        let selectedMark;

        if (type === "female") {
            selectedMark = "Female";
        }

        else if (type === "male") {
            selectedMark = "Male";
        }

        else {
            selectedMark = "Life expectancy gap";
        }


        tooltip
            .style("display", "block")
            .style(
                "left",
                `${event.pageX + 16}px`
            )
            .style(
                "top",
                `${event.pageY - 30}px`
            )
            .html(`
                <div class="tooltip-title">
                    ${d["Country Name"]}
                    (${d["Country Code"]})
                </div>

                <div>
                    <strong>Year:</strong>
                    ${d.Year}
                </div>

                <div>
                    <strong>Female:</strong>
                    ${d3.format(".1f")(
                        d.female_life_expectancy
                    )} years
                </div>

                <div>
                    <strong>Male:</strong>
                    ${d3.format(".1f")(
                        d.male_life_expectancy
                    )} years
                </div>

                <div>
                    <strong>Female − male:</strong>
                    ${d3.format("+.1f")(
                        d.life_expectancy_gap
                    )} years
                </div>

                <div>
                    <strong>Population age 65+:</strong>
                    ${d3.format(".1f")(
                        d.population_65_plus
                    )}%
                </div>

                <div>
                    <strong>Selected:</strong>
                    ${selectedMark}
                </div>
            `);
    }


    function hideTooltip() {

        tooltip.style(
            "display",
            "none"
        );
    }


    /*
    ==================================================
    VISUAL 1
    LIFE EXPECTANCY VS POPULATION AGE 65+

    DENNISE VISUAL
    ==================================================
    */

    const v1Width = 1100;

    const v1Height = 650;

    const v1Margin = {
        top: 65,
        right: 50,
        bottom: 85,
        left: 95
    };


    const svg = d3.select("#chart")
        .append("svg")
        .attr(
            "viewBox",
            `0 0 ${v1Width} ${v1Height}`
        );


    const xScale = d3.scaleLinear()
        .domain([
            d3.min(
                cleanData,
                d => Math.min(
                    d.female_life_expectancy,
                    d.male_life_expectancy
                )
            ),

            d3.max(
                cleanData,
                d => Math.max(
                    d.female_life_expectancy,
                    d.male_life_expectancy
                )
            )
        ])
        .nice()
        .range([
            v1Margin.left,
            v1Width - v1Margin.right
        ]);


    const yScale = d3.scaleLinear()
        .domain([
            0,

            d3.max(
                cleanData,
                d => d.population_65_plus
            )
        ])
        .nice()
        .range([
            v1Height - v1Margin.bottom,
            v1Margin.top
        ]);


    // Grid lines
    svg.append("g")
        .attr(
            "transform",
            `translate(${v1Margin.left}, 0)`
        )
        .call(
            d3.axisLeft(yScale)
                .tickSize(
                    -(
                        v1Width -
                        v1Margin.left -
                        v1Margin.right
                    )
                )
                .tickFormat("")
        )
        .call(grid => {

            grid.select(".domain")
                .remove();

            grid.selectAll("line")
                .attr(
                    "stroke",
                    "#dfe6ee"
                )
                .attr(
                    "stroke-dasharray",
                    "4,4"
                );
        });


    // X-axis
    svg.append("g")
        .attr(
            "transform",
            `translate(
                0,
                ${v1Height - v1Margin.bottom}
            )`
        )
        .call(
            d3.axisBottom(xScale)
                .ticks(8)
        );


    // Y-axis
    svg.append("g")
        .attr(
            "transform",
            `translate(${v1Margin.left}, 0)`
        )
        .call(
            d3.axisLeft(yScale)
                .ticks(8)
                .tickFormat(
                    d => `${d}%`
                )
        );


    // X-axis label
    svg.append("text")
        .attr(
            "class",
            "axis-label"
        )
        .attr(
            "x",
            v1Width / 2
        )
        .attr(
            "y",
            v1Height - 22
        )
        .attr(
            "text-anchor",
            "middle"
        )
        .text(
            "Life Expectancy at Birth (Years)"
        );


    // Y-axis label
    svg.append("text")
        .attr(
            "class",
            "axis-label"
        )
        .attr(
            "transform",
            "rotate(-90)"
        )
        .attr(
            "x",
            -v1Height / 2
        )
        .attr(
            "y",
            25
        )
        .attr(
            "text-anchor",
            "middle"
        )
        .text(
            "Population Age 65+ (% of Total Population)"
        );


    const backgroundYear =
        svg.append("text")
            .attr(
                "class",
                "background-year"
            )
            .attr(
                "x",
                v1Width - v1Margin.right
            )
            .attr(
                "y",
                v1Margin.top + 70
            )
            .attr(
                "text-anchor",
                "end"
            );


    /*
    ==============================================
    UPDATE VISUAL 1
    ==============================================
    */

    function updateVisual1(year) {

        const yearData =
            cleanData.filter(
                d => d.Year === year
            );


        backgroundYear.text(year);


        d3.select("#chart-title")
            .text(
                `Female and Male Life Expectancy, ${year}`
            );


        d3.select("#observation-count")
            .text(
                `${yearData.length} observations have complete data for ${year}.`
            );


        /*
        CONNECTING LINES
        Only visible when "Both" is selected.
        */

        svg.selectAll(".comparison-line")
            .data(
                yearData,
                d => d["Country Code"]
            )
            .join("line")
            .attr(
                "class",
                "comparison-line"
            )
            .attr(
                "stroke",
                "#aeb8c7"
            )
            .attr(
                "stroke-width",
                1.5
            )
            .transition()
            .duration(600)
            .attr(
                "x1",
                d => xScale(
                    d.male_life_expectancy
                )
            )
            .attr(
                "x2",
                d => xScale(
                    d.female_life_expectancy
                )
            )
            .attr(
                "y1",
                d => yScale(
                    d.population_65_plus
                )
            )
            .attr(
                "y2",
                d => yScale(
                    d.population_65_plus
                )
            )
            .attr(
                "opacity",
                selectedGender === "both"
                    ? 0.55
                    : 0
            );


        /*
        MALE POINTS
        */

        const malePoints =
            svg.selectAll(".male-point")
                .data(
                    yearData,
                    d => d["Country Code"]
                )
                .join("circle")
                .attr(
                    "class",
                    "male-point"
                )
                .attr(
                    "fill",
                    "#3487bd"
                )
                .attr(
                    "stroke",
                    "white"
                )
                .attr(
                    "stroke-width",
                    1.2
                )
                .attr(
                    "r",
                    5
                )
                .style(
                    "pointer-events",
                    selectedGender === "female"
                        ? "none"
                        : "auto"
                );


        malePoints
            .on(
                "mouseenter",
                function(event, d) {

                    d3.select(this)
                        .attr("r", 8);

                    showTooltip(
                        event,
                        d,
                        "male"
                    );
                }
            )
            .on(
                "mousemove",
                function(event, d) {

                    showTooltip(
                        event,
                        d,
                        "male"
                    );
                }
            )
            .on(
                "mouseleave",
                function() {

                    d3.select(this)
                        .attr("r", 5);

                    hideTooltip();
                }
            );


        malePoints
            .transition()
            .duration(600)
            .attr(
                "cx",
                d => xScale(
                    d.male_life_expectancy
                )
            )
            .attr(
                "cy",
                d => yScale(
                    d.population_65_plus
                )
            )
            .attr(
                "opacity",
                selectedGender === "female"
                    ? 0
                    : 0.85
            );


        /*
        FEMALE POINTS
        */

        const femalePoints =
            svg.selectAll(".female-point")
                .data(
                    yearData,
                    d => d["Country Code"]
                )
                .join("circle")
                .attr(
                    "class",
                    "female-point"
                )
                .attr(
                    "fill",
                    "#d35d91"
                )
                .attr(
                    "stroke",
                    "white"
                )
                .attr(
                    "stroke-width",
                    1.2
                )
                .attr(
                    "r",
                    5
                )
                .style(
                    "pointer-events",
                    selectedGender === "male"
                        ? "none"
                        : "auto"
                );


        femalePoints
            .on(
                "mouseenter",
                function(event, d) {

                    d3.select(this)
                        .attr("r", 8);

                    showTooltip(
                        event,
                        d,
                        "female"
                    );
                }
            )
            .on(
                "mousemove",
                function(event, d) {

                    showTooltip(
                        event,
                        d,
                        "female"
                    );
                }
            )
            .on(
                "mouseleave",
                function() {

                    d3.select(this)
                        .attr("r", 5);

                    hideTooltip();
                }
            );


        femalePoints
            .transition()
            .duration(600)
            .attr(
                "cx",
                d => xScale(
                    d.female_life_expectancy
                )
            )
            .attr(
                "cy",
                d => yScale(
                    d.population_65_plus
                )
            )
            .attr(
                "opacity",
                selectedGender === "male"
                    ? 0
                    : 0.85
            );
    }



    /*
    ==================================================
    VISUAL 2
    WHO OUTLIVES WHOM?

    DENNISE VISUAL
    ==================================================
    */

    
    /*
==================================================
VISUAL 2
WHO OUTLIVES WHOM?

Each circle = one country/observation

X = Female life expectancy
Y = Female life expectancy - Male life expectancy

Above 0 = females live longer
Below 0 = males live longer
==================================================
*/

const v2Width = 700;
const v2Height = 650;

const v2Margin = {
    top: 60,
    right: 45,
    bottom: 85,
    left: 85
};


// Create the SVG for Visual 2
const gapSvg = d3.select("#gap-chart")
    .append("svg")
    .attr(
        "viewBox",
        `0 0 ${v2Width} ${v2Height}`
    );


// -----------------------------
// X SCALE
// Female life expectancy
// -----------------------------

const gapXScale = d3.scaleLinear()
    .domain(
        d3.extent(
            cleanData,
            d => d.female_life_expectancy
        )
    )
    .nice()
    .range([
        v2Margin.left,
        v2Width - v2Margin.right
    ]);


// -----------------------------
// Y SCALE
// Female - Male life expectancy
// -----------------------------

const gapExtent = d3.extent(
    cleanData,
    d => d.life_expectancy_gap
);


// Make sure zero is always included
const gapYMinimum = Math.min(
    gapExtent[0],
    0
);

const gapYMaximum = Math.max(
    gapExtent[1],
    0
);


const gapYScale = d3.scaleLinear()
    .domain([
        gapYMinimum,
        gapYMaximum
    ])
    .nice()
    .range([
        v2Height - v2Margin.bottom,
        v2Margin.top
    ]);


// -----------------------------
// GRID LINES
// -----------------------------

gapSvg.append("g")
    .attr(
        "transform",
        `translate(${v2Margin.left}, 0)`
    )
    .call(
        d3.axisLeft(gapYScale)
            .tickSize(
                -(
                    v2Width -
                    v2Margin.left -
                    v2Margin.right
                )
            )
            .tickFormat("")
    )
    .call(grid => {

        grid.select(".domain")
            .remove();

        grid.selectAll("line")
            .attr("stroke", "#e1e7ef")
            .attr(
                "stroke-dasharray",
                "3,3"
            );
    });


// -----------------------------
// X AXIS
// -----------------------------

gapSvg.append("g")
    .attr(
        "transform",
        `translate(
            0,
            ${v2Height - v2Margin.bottom}
        )`
    )
    .call(
        d3.axisBottom(gapXScale)
            .ticks(7)
    );


// -----------------------------
// Y AXIS
// -----------------------------

gapSvg.append("g")
    .attr(
        "transform",
        `translate(${v2Margin.left}, 0)`
    )
    .call(
        d3.axisLeft(gapYScale)
            .ticks(8)
    );


// -----------------------------
// X AXIS LABEL
// -----------------------------

gapSvg.append("text")
    .attr("class", "axis-label")
    .attr(
        "x",
        v2Width / 2
    )
    .attr(
        "y",
        v2Height - 25
    )
    .attr(
        "text-anchor",
        "middle"
    )
    .text(
        "Female Life Expectancy at Birth (Years)"
    );


// -----------------------------
// Y AXIS LABEL
// -----------------------------

gapSvg.append("text")
    .attr("class", "axis-label")
    .attr(
        "transform",
        "rotate(-90)"
    )
    .attr(
        "x",
        -v2Height / 2
    )
    .attr(
        "y",
        22
    )
    .attr(
        "text-anchor",
        "middle"
    )
    .text(
        "Female − Male Life Expectancy (Years)"
    );


// -----------------------------
// ZERO LINE
// -----------------------------

gapSvg.append("line")
    .attr(
        "class",
        "gap-zero-line"
    )
    .attr(
        "x1",
        v2Margin.left
    )
    .attr(
        "x2",
        v2Width - v2Margin.right
    )
    .attr(
        "y1",
        gapYScale(0)
    )
    .attr(
        "y2",
        gapYScale(0)
    );


// Label above zero
gapSvg.append("text")
    .attr(
        "class",
        "gap-explanation"
    )
    .attr(
        "x",
        v2Margin.left + 10
    )
    .attr(
        "y",
        gapYScale(0) - 10
    )
    .text(
        "Above: females outlive males"
    );


// Label below zero
gapSvg.append("text")
    .attr(
        "class",
        "gap-explanation"
    )
    .attr(
        "x",
        v2Margin.left + 10
    )
    .attr(
        "y",
        gapYScale(0) + 20
    )
    .text(
        "Below: males outlive females"
    );


// -----------------------------
// BACKGROUND YEAR
// -----------------------------

const gapBackgroundYear =
    gapSvg.append("text")
        .attr(
            "class",
            "background-year"
        )
        .attr(
            "x",
            v2Width - v2Margin.right
        )
        .attr(
            "y",
            v2Height -
                v2Margin.bottom -
                25
        )
        .attr(
            "text-anchor",
            "end"
        );


// ==================================================
// UPDATE VISUAL 2
// ==================================================

function updateVisual2(year) {

    // Get the observations for the selected year
    const gapData = cleanData.filter(
        d => d.Year === year
    );


    // Update chart title
    d3.select("#gap-chart-title")
        .text(
            `Who Outlives Whom? ${year}`
        );


    // Update large background year
    gapBackgroundYear.text(year);


    // -----------------------------
    // FIND LARGEST GAP
    // -----------------------------

    const largestGap = d3.greatest(
        gapData,
        d => Math.abs(
            d.life_expectancy_gap
        )
    );


    if (largestGap) {

        d3.select("#largest-gap-value")
            .text(
                `${d3.format("+.1f")(
                    largestGap.life_expectancy_gap
                )} years`
            );


        const direction =
            largestGap.life_expectancy_gap >= 0
                ? "females live longer"
                : "males live longer";


        d3.select("#largest-gap-country")
            .text(
                `${largestGap["Country Name"]}: ${direction}`
            );
    }


    // -----------------------------
    // JOIN DATA TO CIRCLES
    // -----------------------------

    const circles = gapSvg
        .selectAll(".gap-point")
        .data(
            gapData,
            d => d["Country Code"]
        );


    // Remove countries unavailable in the new year
    circles.exit()
        .transition()
        .duration(300)
        .attr("r", 0)
        .attr("opacity", 0)
        .remove();


    // Create circles for new countries
    const newCircles = circles.enter()
        .append("circle")
        .attr(
            "class",
            "gap-point"
        )
        .attr(
            "cx",
            d => gapXScale(
                d.female_life_expectancy
            )
        )
        .attr(
            "cy",
            d => gapYScale(
                d.life_expectancy_gap
            )
        )
        .attr("r", 0)
        .attr(
            "stroke",
            "white"
        )
        .attr(
            "stroke-width",
            1.2
        );


    // Update new and existing circles
    circles
        .merge(newCircles)

        .on(
            "mouseenter",
            function(event, d) {

                d3.select(this)
                    .interrupt()
                    .attr("r", 9)
                    .attr(
                        "stroke",
                        "#243047"
                    )
                    .attr(
                        "stroke-width",
                        2
                    )
                    .attr(
                        "opacity",
                        1
                    );


                showTooltip(
                    event,
                    d,
                    "gap"
                );
            }
        )

        .on(
            "mousemove",
            function(event, d) {

                showTooltip(
                    event,
                    d,
                    "gap"
                );
            }
        )

        .on(
            "mouseleave",
            function() {

                d3.select(this)
                    .interrupt()
                    .attr("r", 6)
                    .attr(
                        "stroke",
                        "white"
                    )
                    .attr(
                        "stroke-width",
                        1.2
                    )
                    .attr(
                        "opacity",
                        0.75
                    );


                hideTooltip();
            }
        )

        .transition()
        .duration(650)

        // X = female life expectancy
        .attr(
            "cx",
            d => gapXScale(
                d.female_life_expectancy
            )
        )

        // Y = female - male gap
        .attr(
            "cy",
            d => gapYScale(
                d.life_expectancy_gap
            )
        )

        .attr("r", 6)

        // Pink above zero
        // Blue below zero
        .attr(
            "fill",
            d =>
                d.life_expectancy_gap >= 0
                    ? "#d35d91"
                    : "#3487bd"
        )

        .attr(
            "opacity",
            0.75
        );
}
     
            



    /*
    ==================================================
    VISUAL 3
    TEAMMATE SECTION

    TEAMMATE:
    Add Visual 3 D3 code below.

    HTML container:
        #visual-3

    If using shared year:
        use selectedYear

    If using shared data:
        use cleanData
    ==================================================
    */

    // TEAMMATE VISUAL 3 CODE HERE



    /*
    ==================================================
    VISUAL 4
    TEAMMATE SECTION

    HTML container:
        #visual-4
    ==================================================
    */

    // TEAMMATE VISUAL 4 CODE HERE



    /*
    ==================================================
    VISUAL 5
    TEAMMATE SECTION

    HTML container:
        #visual-5
    ==================================================
    */

    // TEAMMATE VISUAL 5 CODE HERE



    /*
    ==================================================
    VISUAL 6
    TEAMMATE SECTION

    HTML container:
        #visual-6
    ==================================================
    */

    // TEAMMATE VISUAL 6 CODE HERE



    /*
    ==================================================
    MASTER UPDATE FUNCTION

    Any visualization that should respond
    to the shared year slider should be
    called here.
    ==================================================
    */

    function updateDashboard(year) {

        selectedYear = year;

        slider.property(
            "value",
            selectedYear
        );

        selectedYearText.text(
            selectedYear
        );


        // DENNISE
        updateVisual1(selectedYear);

        // DENNISE
        updateVisual2(selectedYear);


        /*
        TEAMMATES:

        If Visual 3 responds to year:
        updateVisual3(selectedYear);

        If Visual 4 responds to year:
        updateVisual4(selectedYear);

        If Visual 5 responds to year:
        updateVisual5(selectedYear);

        If Visual 6 responds to year:
        updateVisual6(selectedYear);
        */
    }



    /*
    ==================================================
    YEAR SLIDER
    ==================================================
    */

    slider.on(
        "input",
        function() {

            const newYear =
                +this.value;

            /*
            Use the closest available year.
            */

            const nearestYear =
                availableYears.reduce(
                    (
                        nearest,
                        current
                    ) => {

                        return Math.abs(
                            current - newYear
                        ) <
                        Math.abs(
                            nearest - newYear
                        )
                            ? current
                            : nearest;
                    }
                );


            updateDashboard(
                nearestYear
            );
        }
    );



    /*
    ==================================================
    PLAY / PAUSE
    ==================================================
    */

    playButton.on(
        "click",
        function() {

            if (animationTimer !== null) {

                animationTimer.stop();

                animationTimer = null;

                playButton.text(
                    "▶ Play"
                );

                return;
            }


            playButton.text(
                "❚❚ Pause"
            );


            animationTimer =
                d3.interval(() => {

                    const currentIndex =
                        availableYears.indexOf(
                            selectedYear
                        );


                    const nextIndex =
                        currentIndex ===
                        availableYears.length - 1

                            ? 0

                            : currentIndex + 1;


                    updateDashboard(
                        availableYears[
                            nextIndex
                        ]
                    );

                }, 900);
        }
    );



    /*
    ==================================================
    FEMALE / MALE / BOTH BUTTONS

    These currently control Visual 1 only.
    ==================================================
    */

    genderButtons.on(
        "click",
        function() {

            selectedGender =
                this.dataset.gender;


            genderButtons.classed(
                "active",
                false
            );


            d3.select(this)
                .classed(
                    "active",
                    true
                );


            hideTooltip();


            // Only Visual 1 needs this filter.
            updateVisual1(
                selectedYear
            );
        }
    );



    /*
    ==================================================
    INITIAL PAGE LOAD
    ==================================================
    */

    updateDashboard(
        selectedYear
    );


}).catch(error => {

    console.error(
        "Dashboard could not load:",
        error
    );


    d3.select(".dashboard")
        .append("p")
        .style(
            "color",
            "#b42318"
        )
        .style(
            "font-weight",
            "bold"
        )
        .text(
            "The dashboard could not load. Check the browser console and confirm merged_data.csv is in the project folder."
        );
});