import React, { Component } from 'react';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import _ from 'lodash';
import * as am4core from "@amcharts/amcharts4/core";
import * as am4charts from "@amcharts/amcharts4/charts";

const CLIENTS = {};
const ORDER_BOOK = {};
const MAX_TRADES = 50;

const red = '#d16547';
const green = '#4aa165';

class App extends Component {

    constructor(props) {
        super(props);
        this.state = {
          newApiKey: '',
          keys: ['1', '2', '3'],
          trades: []
        }
    }

    setKeys(keys) {
        this.setState({ keys });
    }

    setNewApiKey(newApiKey) {
        this.setState({ newApiKey });
    }


    setTrades(trades) {
        this.setState({ trades });
    }

    createDepthChart() {

        let chart = am4core.create("chartdiv", am4charts.XYChart);

        // Add data
        chart.dataSource.url = "https://poloniex.com/public?command=returnOrderBook&currencyPair=USDT_BTC&depth=50";
        chart.dataSource.reloadFrequency = 3000;
        chart.dataSource.adapter.add("parsedData", function(data) {

          // Function to process (sort and calculate cummulative volume)
          function processData(list, type, desc) {

            // Convert to data points
            for(let i = 0; i < list.length; i++) {
              list[i] = {
                value: Number(list[i][0]),
                volume: Number(list[i][1]),
              }
            }

            // Sort list just in case
            list.sort(function(a, b) {
              if (a.value > b.value) {
                return 1;
              }
              else if (a.value < b.value) {
                return -1;
              }
              else {
                return 0;
              }
            });

            // Calculate cummulative volume
            if (desc) {
              for(let i = list.length - 1; i >= 0; i--) {
                if (i < (list.length - 1)) {
                  list[i].totalvolume = list[i+1].totalvolume + list[i].volume;
                }
                else {
                  list[i].totalvolume = list[i].volume;
                }
                const dp = {};
                dp["value"] = list[i].value;
                dp[type + "volume"] = list[i].volume;
                dp[type + "totalvolume"] = list[i].totalvolume;
                res.unshift(dp);
              }
            }
            else {
              for(var i = 0; i < list.length; i++) {
                if (i > 0) {
                  list[i].totalvolume = list[i-1].totalvolume + list[i].volume;
                }
                else {
                  list[i].totalvolume = list[i].volume;
                }
                const dp = {};
                dp["value"] = list[i].value;
                dp[type + "volume"] = list[i].volume;
                dp[type + "totalvolume"] = list[i].totalvolume;
                res.push(dp);
              }
            }

          }

          // Init
          var res = [];
          processData(data.bids, "bids", true);
          processData(data.asks, "asks", false);

          return res;
        });

        // Set up precision for numbers
        chart.numberFormatter.numberFormat = "#,###.";

        // Create axes
        const xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
        xAxis.dataFields.category = "value";
        xAxis.renderer.grid.template.disabled = true;
        xAxis.renderer.minGridDistance = 200;
        // xAxis.title.text = "Price (BTC/ETH)";

        const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
        // yAxis.title.text = "Volume";
        yAxis.renderer.minGridDistance = 200;
        yAxis.renderer.grid.template.disabled = true;

        // Create series
        const series = chart.series.push(new am4charts.StepLineSeries());
        series.dataFields.categoryX = "value";
        series.dataFields.valueY = "bidstotalvolume";
        series.strokeWidth = 2;
        series.stroke = am4core.color("#45a75e");
        series.fill = am4core.color("#b0dcba");
        series.fillOpacity = 1;
        // series.tooltipText = "Ask: [bold]{categoryX}[/]\nTotal volume: [bold]{valueY}[/]\nVolume: [bold]{bidsvolume}[/]"

        const series2 = chart.series.push(new am4charts.StepLineSeries());
        series2.dataFields.categoryX = "value";
        series2.dataFields.valueY = "askstotalvolume";
        series2.strokeWidth = 2;
        series2.stroke = am4core.color("#e05a3f");
        series2.fill = am4core.color("#f4b9ac");
        series2.fillOpacity = 1;
        // series2.tooltipText = "Ask: [bold]{categoryX}[/]\nTotal volume: [bold]{valueY}[/]\nVolume: [bold]{asksvolume}[/]"

        // Add cursor
        chart.cursor = new am4charts.XYCursor();

        this.chart = chart;
    }

    componentDidMount() {
        this.createDepthChart();
        this.addClient();
    }

    componentWillUnmount() {
        if (this.chart) {
            this.chart.dispose();
        }
    }

    addClient(apiKey, apiSecret) {
        if(!apiKey && !apiSecret && !CLIENTS['public']) {
            const client = new W3CWebSocket('wss://www.bitmex.com/realtime?subscribe=trade:XBTUSD,orderBookL2_25:XBTUSD');
            client.onopen = () => {
                console.log('WebSocket Client Connected');
            };
            client.onmessage = (message) => {
                const json = JSON.parse(message.data);
                const action = json['action'];
                const table = json['table'];
                if(table === 'trade') {
                    if(action === 'insert') {
                        // let trades = this.state.trades;
                        // trades = [...this.state.trades, ...json.data];
                        // json.data.forEach(trade => {
                        //     trades.push(trade);
                        // });
                        // if(trades.length > MAX_TRADES) {
                        //     trades = trades.slice(trades.length-MAX_TRADES, trades.length);
                        // }
                        this.setTrades([...json.data.reverse(), ...this.state.trades].slice(0, MAX_TRADES));
                    }
                } else if(table === 'orderBookL2_25') {
                    if(action === 'partial') {
                        json.data.forEach(ob => ORDER_BOOK[ob['id']] = ob);
                    } else if(action === 'insert') {
                        json.data.forEach(ob => ORDER_BOOK[ob['id']] = ob);
                    } else if(action === 'update') {
                        json.data.forEach(ob => {
                            const current = ORDER_BOOK[ob['id']];
                            if(current) {
                                ORDER_BOOK[ob['id']]['side'] = ob['side'];
                                ORDER_BOOK[ob['id']]['size'] = ob['size'];
                            }
                        });
                    } else if(action === 'delete') {
                      json.data.forEach(ob => {
                          const current = ORDER_BOOK[ob['id']];
                          if(current) {
                              if(ORDER_BOOK[ob['id']]['side'] === ob['side']) {
                                  delete ORDER_BOOK[ob['id']];
                              }
                          }
                      });
                    }
                    var order_book_array = Object.keys(ORDER_BOOK).map(function(key) {
                        return ORDER_BOOK[key];
                    });
                    const buyOrders = _.sortBy(order_book_array.filter(ob => ob['side'] === 'Buy'), ['price']);
                    const sellOrders = _.sortBy(order_book_array.filter(ob => ob['side'] === 'Sell'), ['price']);
                    // TODO - use these arrays to generate depth chart
                }
            };
            CLIENTS['public'] = client;
        }
    }

    handleChangeNewApiKey(event) {
        this.setNewApiKey(event.target.value);
    }

    addNewApiKey() {
        this.setKeys([...this.state.keys, this.state.newApiKey]);
    }

    render() {
        return (
          <Container>
              <Grid container spacing={4}>
                 {/*<Grid item xs={3}>
                     {this.state.keys.map((key) => {
                        return <div key={key}>{key}</div>;
                     })}
                     <input type="text" value={this.state.newApiKey} onChange={this.handleChangeNewApiKey} />
                     <Button variant="contained" color="primary" onClick={this.addNewApiKey}>Add</Button>
                 </Grid>*/}
                 <Grid item xs={9}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom><strong>XBT/USD:</strong> Depth Chart</Typography>
                            <div id="chartdiv" style={{ width: "100%", height: "500px" }}></div>
                        </CardContent>
                    </Card>
                 </Grid>
                 <Grid item xs={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>Recent Trades</Typography>
                            <div style={{maxHeight: 600 + 'px', overflowY: 'hidden'}}>
                               {this.state.trades.map((trade) => {
                                  const color = trade.side === 'Buy' ? green : red;
                                  return (
                                      <Grid container spacing={1}>
                                          <Grid item xs={2} align="right" style={{color: color, fontWeight: 600}}>{trade['price'].toFixed(1)}</Grid>
                                          <Grid item xs={5} align="right" style={{color: color}}>{trade['size'].toLocaleString()}</Grid>
                                          <Grid item xs={5} align="right" style={{color: color}}>{trade['timestamp'].split('T')[1].slice(0, -5)}</Grid>
                                      </Grid>
                                  );
                               })}
                            </div>
                        </CardContent>
                    </Card>
                 </Grid>
              </Grid>
          </Container>
        );
    }
}

export default App;
