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
    if (!userMessage) return res.send("Вы ничего не спросили.");

    try {
        const response = await axios.post('https://text.pollinations.ai/openai', {
            model: "openai", 
            messages: [
                { role: "system", content: KNOWLEDGE_BASE },
                { role: "user", content: userMessage }
            ]
        });
        
        // Отправляем ЧИСТЫЙ ТЕКСТ без JSON
        res.send(response.data.choices[0].message.content);
        
    } catch (error) {
        console.error("Ошибка:", error.message);
        res.send("ИИ временно недоступен. Попробуйте позже.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Сервер работает!`));
