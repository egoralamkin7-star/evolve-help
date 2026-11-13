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

const GIGACHAT_AUTH_KEY = process.env.GIGACHAT_AUTH_KEY; 

// Список моделей для перебора. Начинаем с самых доступных.
const MODELS_TO_TRY = [
    "GigaChat-2", 
    "GigaChat-2-Max", 
    "GigaChat-3-Ultra", 
    "GigaChat"
];

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

    let lastError = null;

    // Пробуем модели по очереди
    for (const modelName of MODELS_TO_TRY) {
        try {
            const response = await axios.post('https://api.giga.chat/v1/chat/completions', {
                model: modelName,
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
            
            // Если запрос успешен, возвращаем ответ и выходим из цикла
            return res.json({ reply: response.data.choices[0].message.content });

        } catch (error) {
            lastError = error;
            // Если ошибка 404 (модель не найдена), пробуем следующую
            if (error.response && error.response.status === 404) {
                console.log(`Модель ${modelName} не найдена, пробуем следующую...`);
                continue; 
            } else {
                // При других ошибках (например, 401) прекращаем перебор
                console.error(`Ошибка при запросе к модели ${modelName}:`, error.response ? JSON.stringify(error.response.data) : error.message);
                break;
            }
        }
    }

    // Если все модели перебраны и ни одна не сработала
    console.error("Все модели вернули ошибку. Последняя ошибка:", lastError.response ? JSON.stringify(lastError.response.data) : lastError.message);
    res.json({ reply: "ИИ временно недоступен. Все доступные модели вернули ошибку." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Сервер работает на порту ${PORT}!`));
