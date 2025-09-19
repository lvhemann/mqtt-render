import express from "express";
import mqtt from "mqtt";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const app = express();

// =================== Config banco ===================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// =================== Config MQTT ===================
const MQTT_BROKER = "mqtt://test.mosquitto.org:1883";
const SUB_TOPIC = "grupo1/teste";
const PUB_TOPIC = "grupo1/cmd";

const client = mqtt.connect(MQTT_BROKER);

// =================== Express ===================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (HTML/CSS/JS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// ----------------- MQTT -----------------
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

  // Resposta para ESP32
  client.publish(PUB_TOPIC, "✅ Render recebeu e gravou!");
});

// ----------------- Rotas API -----------------

// Buscar mensagens (com limite configurável)
app.get("/api/mensagens", async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const result = await pool.query(
      "SELECT * FROM mensagens ORDER BY id DESC LIMIT $1",
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Erro ao buscar mensagens");
  }
});

// Enviar mensagem manual pelo painel
app.post("/api/enviar", (req, res) => {
  const msg = req.body.mensagem;
  if (!msg) return res.status(400).send("Mensagem vazia");
  client.publish(SUB_TOPIC, msg);
  res.json({ enviado: msg });
});

// =================== Start ===================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 HTTP rodando na porta ${PORT}`));
