import React, { useState } from 'react';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';

const CLIENTS = {};
const LOCAL_TRADES = [];
const MAX_TRADES = 30;

const red = '#d16547';
const green = '#4aa165';

function App() {

  const [newApiKey, setNewApiKey] = useState("");
  const [keys, setKeys] = useState(['1', '2', '3']);
  const [trades, setTrades] = useState([]);

  const addClient = (apiKey, apiSecret) => {
    if(!apiKey && !apiSecret && !CLIENTS['public']) {
        const client = new W3CWebSocket('wss://www.bitmex.com/realtime?subscribe=trade:XBTUSD');
        const trades = [];
        client.onopen = () => {
            console.log('WebSocket Client Connected');
        };
        client.onmessage = (message) => {
            const json = JSON.parse(message.data);
            const action = json['action']
            if(action === 'insert') {
                json.data.forEach(trade => {
                    LOCAL_TRADES.push(trade);
                    if(LOCAL_TRADES.length > MAX_TRADES) {
                        LOCAL_TRADES.shift();
                    }
                });
                setTrades(trades.concat(LOCAL_TRADES));
            }
        };
        CLIENTS['public'] = client;
    }
  };

  const handleChangeNewApiKey = (event) => {
    setNewApiKey(event.target.value);
  };

  const addNewApiKey = () => {
    setKeys(keys => [...keys, newApiKey]);
  }

  addClient();

  return (
    <Container>
        <Grid container spacing={2}>
           <Grid item xs={3}>
               {keys.map((key) => {
                  return <div key={key}>{key}</div>;
               })}
               <input type="text" value={newApiKey} onChange={handleChangeNewApiKey} />
               <Button variant="contained" color="primary" onClick={addNewApiKey}>Add</Button>
           </Grid>
           <Grid item xs={6}></Grid>
           <Grid item xs={3}>
              <Card>
                  <CardContent>
                      <Typography color="textSecondary" gutterBottom>Recent Trades</Typography>
                      <div style={{maxHeight: 600 + 'px', overflowY: 'hidden'}}>
                         {trades.reverse().map((trade) => {
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

export default App;
