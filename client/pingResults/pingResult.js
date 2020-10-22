import { PingStatus } from '../../imports/api/pingStatus.js';
import HighCharts from 'highcharts';

Template.pingResult.onCreated(function () {
  this.autorun(() => {
    this.subscribe("pingStatuses", Session.get("myUrl"));
  });
});

Template.pingResult.onRendered(function () {
  $('.modal').modal();

  this.autorun(() => {
    let myUrl = Session.get("myUrl"); // will redraw the base chart if the url changes (if you don't want to do this, move this line above the autorun)
    
    this.chart = HighCharts.chart('container', {
        chart: {
            zoomType: 'x'
        },
        title: {
            text: 'URL Ping Times over Time'
        },
        subtitle: {
            text: document.ontouchstart === undefined ?
                    'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
        },
        tooltip: {
            headerFormat: '<span style="font-size:10px">Date / Ping Time</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0;font-size:11px;">{series.name}: </td>' +
            '<td style="padding:0"><b>{point.x}, {point.y} ms</b></td></tr>',
            footerFormat: '</table>',
            shared: true,
            useHTML: true
        },
        xAxis: {
          type: 'string',
          crosshair: {
            snap: true
          }
        },
        yAxis: {
            title: {
                text: 'Ping Times'
            }
        },
        legend: {
            enabled: false
        },
        plotOptions: {
            area: {
                fillColor: {
                    linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1
                    },
                    stops: [
                        [0, HighCharts.getOptions().colors[0]],
                        [1, HighCharts.Color(HighCharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                    ]
                },
                marker: {
                    radius: 2
                },
                lineWidth: 1,
                states: {
                    hover: {
                        lineWidth: 1
                    }
                },
                threshold: null
            }
        },
        series: [{
            type: 'area',
            name: 'Days / Ping Times',
            data: this.data
        }]
    });

    if (this.subscriptionsReady()) { // Whenever the data changes or is first available...
      this.data = PingStatus.find({}) // (re)generate the series data
        .map(doc => {
          return [doc.runOn, doc.pingTime]
        });
      this.chart.series[0].setData(this.data); // and give it to be re-rendered
    }
  });
});

Template.pingResult.helpers({
  myUrl: function () {
    return Session.get("myUrl");
  },
});

Template.pingResult.events({
  'click .pingTimeModal'(event) {
    event.preventDefault();
    Session.set("myUrl", "");

    let thisModal = document.getElementById("modal-ping");
    thisModal.style.display = "none";
  }
});
