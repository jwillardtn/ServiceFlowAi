const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('<h1>ServiceFlow AI is live</h1>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Running on port ${PORT}`);
});
