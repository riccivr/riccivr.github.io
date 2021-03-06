// lightbox plugin, disable scrolling while viewing the image
lightbox.option({
    'disableScrolling': true
});

// plotting charts section
var doughnutData = [
    {
        value: 80,
        color:"#1abc9c"
    },
    {
        value : 20,
        color : "#ecf0f1"
    }
];
var myDoughnut = new Chart(document.getElementById("javascript").getContext("2d")).Doughnut(doughnutData);

var doughnutData = [
    {
        value: 90,
        color:"#1abc9c"
    },
    {
        value : 10,
        color : "#ecf0f1"
    }
];
var myDoughnut = new Chart(document.getElementById("bootstrap").getContext("2d")).Doughnut(doughnutData);

var doughnutData = [
    {
        value: 90,
        color:"#1abc9c"
    },
    {
        value : 10,
        color : "#ecf0f1"
    }
];
var myDoughnut = new Chart(document.getElementById("wordpress").getContext("2d")).Doughnut(doughnutData);

var doughnutData = [
    {
        value: 100,
        color:"#1abc9c"
    },
    {
        value : 0,
        color : "#ecf0f1"
    }
];
var myDoughnut = new Chart(document.getElementById("html").getContext("2d")).Doughnut(doughnutData);

var doughnutData = [
    {
        value: 80,
        color:"#1abc9c"
    },
    {
        value : 20,
        color : "#ecf0f1"
    }
];
var myDoughnut = new Chart(document.getElementById("photoshop").getContext("2d")).Doughnut(doughnutData);
                            
var doughnutData = [
    {
        value: 50,
        color:"#1abc9c"
    },
    {
        value : 50,
        color : "#ecf0f1"
    }
];
var myDoughnut = new Chart(document.getElementById("inkscape").getContext("2d")).Doughnut(doughnutData);