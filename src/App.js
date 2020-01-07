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

        chart.numberFormatter.numberFormat = "#,###.";

        const xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
        xAxis.dataFields.category = "value";
        xAxis.renderer.grid.template.disabled = true;
        xAxis.renderer.minGridDistance = 200;

        const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
        yAxis.renderer.minGridDistance = 100;

        const series = chart.series.push(new am4charts.StepLineSeries());
        series.dataFields.categoryX = "value";
        series.dataFields.valueY = "bidstotalvolume";
        series.strokeWidth = 2;
        series.stroke = am4core.color("#45a75e");
        series.fill = am4core.color("#b0dcba");
        series.fillOpacity = 1;

        const series2 = chart.series.push(new am4charts.StepLineSeries());
        series2.dataFields.categoryX = "value";
        series2.dataFields.valueY = "askstotalvolume";
        series2.strokeWidth = 2;
        series2.stroke = am4core.color("#e05a3f");
        series2.fill = am4core.color("#f4b9ac");
        series2.fillOpacity = 1;

        chart.cursor = new am4charts.XYCursor();

        this.chart = chart;
    }

    componentDidMount() {
        this.addClient();
        // TODO - only create the depth chart after the order book is built
        this.createDepthChart();
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
                    const buyOrders = _.sortBy(order_book_array.filter(ob => ob['side'] === 'Buy'), ['price']).reverse();
                    const sellOrders = _.sortBy(order_book_array.filter(ob => ob['side'] === 'Sell'), ['price']);
                    let depthData = [];
                    let buyTotal = 0;
                    buyOrders.forEach(order => {
                        buyTotal += order.size;
                        depthData.push({
                            value: order.price,
                            bidsvolume: order.size,
                            bidstotalvolume: buyTotal
                        })
                    });
                    depthData = depthData.reverse();
                    let sellTotal = 0;
                    sellOrders.forEach(order => {
                        sellTotal += order.size;
                        depthData.push({
                            value: order.price,
                            asksvolume: order.size,
                            askstotalvolume: sellTotal
                        })
                    });
                    this.chart.data = depthData;
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
