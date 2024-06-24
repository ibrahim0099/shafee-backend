const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('test', async () => {
    console.log('Test client connected');
  });

  socket.on('trade', async () => {
    try {
      // Ping Lambda function to get master trade
      const { data: masterTrade } = await axios.get('https://pdzsl5xw2kwfmvauo5g77wok3q0yffpl.lambda-url.us-east-2.on.aws/');

      // Replicate trade using MT4 API
      const connectionId = (await axios.get('https://mt4.mtapi.io/Connect?user=44712225&password=tfkp48&host=18.209.126.198&port=443')).data.id;
      const tradeResponse = (await axios.get(`https://mt4.mtapi.io/OrderSend?id=${connectionId}&symbol=${masterTrade.symbol}&operation=${masterTrade.operation}&volume=${masterTrade.volume}&takeprofit=${masterTrade.takeprofit}&comment=${masterTrade.comment}`)).data;

      // Send trade details back to frontend
      socket.emit('tradeDetails', tradeResponse);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(4000, () => {
  console.log('Listening on port 4000');
});
