const express = require('express');
const axios = require('axios');
const app = express();

const KNOWLEDGE_BASE = `
Вы - умный помощник на сервере GTA SA:MP Evolve RP. 
Отвечайте кратко, дружелюбно и по делу. 
Знания: 
- Как стать полицейским: Подать заявку на форуме в разделе Правительство.
- Где купить машину: Автосалоны отмечены на карте (GPS).
`;

app.get('/api/chat', async (req, res) => {
    const userMessage = req.query.message;
    if (!userMessage) return res.json({ reply: "Вы ничего не спросили." });

    try {
        // Используем бесплатный API Pollinations
        const response = await axios.post('https://text.pollinations.ai/openai', {
            model: "openai", 
            messages: [
                { role: "system", content: KNOWLEDGE_BASE },
                { role: "user", content: userMessage }
            ]
        });
        
        console.log("✅ Успешный ответ от Pollinations");
        res.json({ reply: response.data.choices[0].message.content });
        
    } catch (error) {
        console.error("Ошибка Pollinations:", error.message);
        res.json({ reply: "ИИ временно недоступен. Попробуйте позже." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Сервер работает на порту ${PORT}!`));
