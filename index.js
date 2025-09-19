import express from "express";
import mqtt from "mqtt";
import pkg from "pg";

const { Pool } = pkg;
const app = express();

// ======== Config banco (Render PostgreSQL) ========
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ======== Config MQTT ========
const MQTT_BROKER = "mqtt://test.mosquitto.org:1883";
const SUB_TOPIC = "grupo1/teste"; // ESP32 publica
const PUB_TOPIC = "grupo1/cmd";   // Render responde

const client = mqtt.connect(MQTT_BROKER);

client.on("connect", () => {
  console.log("✅ Conectado ao broker MQTT");
  client.subscribe(SUB_TOPIC, (err) => {
    if (!err) console.log("📡 Inscrito no tópico:", SUB_TOPIC);
  });
});

client.on("message", async (topic, message) => {
  const payload = message.toString();
  console.log(`📥 [${topic}] ${payload}`);

  try {
    await pool.query(
      "INSERT INTO mensagens (topico, payload) VALUES ($1, $2)",
      [topic, payload]
    );
    console.log("💾 Mensagem salva no banco!");
  } catch (err) {
    console.error("❌ Erro ao salvar no banco:", err);
  }

  // Responder ao ESP32
  client.publish(PUB_TOPIC, "✅ Render recebeu e gravou!");
});

// ======== API HTTP (para testar no navegador) ========
app.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM mensagens ORDER BY id DESC LIMIT 5"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Erro ao buscar mensagens");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🌐 HTTP rodando na porta ${PORT}`)
);
