process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
const express = require('express');
const axios = require('axios');
const { randomUUID } = require('crypto');
const app = express();

const KNOWLEDGE_BASE = `
Вы - умный помощник на сервере GTA SA:MP Evolve RP. 
Отвечайте кратко, дружелюбно и по делу. 
Знания: 
- Как стать полицейским: Подать заявку на форуме в разделе Правительство.
- Где купить машину: Автосалоны отмечены на карте (GPS).
`;

// Берем ключ из настроек хостинга Netrun (переменная окружения)
const GIGACHAT_AUTH_KEY = process.env.GIGACHAT_AUTH_KEY; 

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
        return res.json({ reply: "Ошибка авторизации (проверьте ключ GigaChat)." });
    }

    try {
        // ИСПРАВЛЕНО: Официальный эндпоинт и модель GigaChat-2
        const response = await axios.post('https://api.giga.chat/v1/chat/completions', {
            model: "GigaChat-2", 
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

// ВАЖНО: Слушаем порт, который выдает хостинг, и адрес 0.0.0.0
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Сервер работает на порту ${PORT}!`));
