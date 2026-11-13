// server.js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Обход SSL для работы GigaChat на хостинге
const express = require('express');
const axios = require('axios');
const { randomUUID } = require('crypto');
const app = express();

// ⚠️ ВАША БАЗА ЗНАНИЙ (пока тестовая, потом замените на свою)
const KNOWLEDGE_BASE = `
Вы - умный помощник на сервере GTA SA:MP Evolve RP. 
Отвечайте кратко, дружелюбно и по делу. 
Знания: 
- Как стать полицейским: Подать заявку на форуме в разделе Правительство.
- Где купить машину: Автосалоны отмечены на карте (GPS).
`;

const GIGACHAT_AUTH_KEY = "MDFhMWQzOGQtOGU4OC03NjE4LTk4YTQtZjBhNWViZTUwM2Q5OjlkY2RmMmQwLTA0YWYtNGRmNC1iNTVhLTk3MTA4YTkxNzAxYQ=="; 

async function getGigaChatToken() {
    try {
        const response = await axios.post('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', 
            'scope=GIGACHAT_API_PERS',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'RqUID': randomUUID(),
                    'Authorization': `Basic ${GIGACHAT_AUTH_KEY}`
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Ошибка токена:", error.response ? error.response.data : error.message);
        return null;
    }
}

app.get('/api/chat', async (req, res) => {
    const userMessage = req.query.message;
    if (!userMessage) return res.json({ reply: "Вы ничего не спросили." });

    const accessToken = await getGigaChatToken();
    if (!accessToken) {
        return res.json({ reply: "Ошибка авторизации (проверьте ключ или срок его действия)." });
    }

    try {
        const response = await axios.post('https://api.giga.chat/v1/chat/completions', {
            model: "GigaChat",
            messages: [
                { role: "system", content: KNOWLEDGE_BASE },
                { role: "user", content: userMessage }
            ],
            temperature: 0.5,
            max_tokens: 300
        }, {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        res.json({ reply: response.data.choices[0].message.content });
    } catch (error) {
        console.error("Ошибка ИИ:", error.response ? error.response.data : error.message);
        res.json({ reply: "ИИ временно недоступен." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер работает!`));