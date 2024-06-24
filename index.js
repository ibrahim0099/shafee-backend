const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow all origins, adjust as needed for security
    methods: ['GET', 'POST']
  }
});

app.use(cors());

let connectionId = null;
let connectionIdExpiresAt = null;

// Function to check if the connection ID has expired
const isConnectionIdExpired = () => {
  if (!connectionId || !connectionIdExpiresAt) {
    return true;
  }
  return new Date() > connectionIdExpiresAt;
};

// Function to get a new connection ID
const getConnectionId = async () => {
  const response = await axios.get('https://mt4.mtapi.io/Connect?user=44712225&password=tfkp48&host=18.209.126.198&port=443');
  connectionId = response.data;
  connectionIdExpiresAt = new Date(new Date().getTime() + 15 * 60 * 1000); // Assuming the ID expires in 15 minutes
};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('test', async () => {
    console.log('Test client connected.............');
  });

  socket.on('trade', async () => {
    try {
      // Ping Lambda function to get master trade
      const { data: masterTrade } = await axios.get('https://pdzsl5xw2kwfmvauo5g77wok3q0yffpl.lambda-url.us-east-2.on.aws/');

      // Get connection ID if it's expired
      if (isConnectionIdExpired()) {
        await getConnectionId();
        console.log('Obtained new connection ID');
      }

      console.log('current connection ID:', connectionId);

      // Replicate trade using MT4 API
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

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
