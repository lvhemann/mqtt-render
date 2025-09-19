import express from "express";
import mqtt from "mqtt";

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar ao broker MQTT público
const client = mqtt.connect("mqtt://test.mosquitto.org:1883");

let lastMessage = "sem dados ainda";

// Quando conectar no broker
client.on("connect", () => {
  console.log("✅ Conectado ao MQTT");
  client.subscribe("grupo1/teste");
});

// Quando receber mensagens
client.on("message", (topic, message) => {
  lastMessage = message.toString();
  console.log(`[${topic}] ${lastMessage}`);
});

// Endpoint para acessar último dado
app.get("/data", (req, res) => {
  res.send(lastMessage);
});

// Página HTML simples
app.get("/", (req, res) => {
  res.send(`
    <html>
    <body>
      <h1>Último dado do ESP32</h1>
      <div id="data">Carregando...</div>
      <script>
        async function update() {
          let res = await fetch('/data');
          let txt = await res.text();
          document.getElementById('data').innerText = txt;
        }
        setInterval(update, 2000);
        update();
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log("🚀 Servidor rodando na porta " + PORT));
