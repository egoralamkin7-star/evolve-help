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

// Список комбинаций "модель + версия API" для перебора
const ATTEMPTS = [
    { model: "GigaChat-3-Ultra", endpoint: "v1" },
    { model: "GigaChat-3-Ultra", endpoint: "v2" },
    { model: "GigaChat-2-Max", endpoint: "v1" },
    { model: "GigaChat-2-Pro", endpoint: "v1" },
    { model: "GigaChat-2", endpoint: "v1" }
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
        return res.json({ reply: "Ошибка авторизации. Проверьте ключ GigaChat в настройках Netrun." });
    }

    // Перебираем все комбинации
    for (const attempt of ATTEMPTS) {
        const url = `https://api.giga.chat/${attempt.endpoint}/chat/completions`;
        
        try {
            const payload = {
                model: attempt.model,
                messages: [
                    { role: "system", content: KNOWLEDGE_BASE },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.5,
                max_tokens: 300
            };

            // Для v2 API формат сообщений может отличаться (массив объектов с text)
            if (attempt.endpoint === "v2") {
                payload.messages = [
                    { role: "system", content: [{ text: KNOWLEDGE_BASE }] },
                    { role: "user", content: [{ text: userMessage }] }
                ];
            }

            const response = await axios.post(url, payload, {
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            // Если дошли сюда — комбинация сработала!
            console.log(`✅ Успех: модель "${attempt.model}" через API "${attempt.endpoint}"`);
            return res.json({ reply: response.data.choices[0].message.content });

        } catch (error) {
            // Если ошибка 404 — пробуем следующую комбинацию
            if (error.response && error.response.status === 404) {
                console.log(`❌ Не найдено: модель "${attempt.model}" через API "${attempt.endpoint}"`);
                continue; 
            } else {
                // При других ошибках (например, 401) — останавливаемся и логируем
                console.error(`Критическая ошибка для "${attempt.model}" (${attempt.endpoint}):`, 
                    error.response ? JSON.stringify(error.response.data) : error.message);
                return res.json({ reply: "Ошибка на стороне ИИ. Проверьте логи Netrun." });
            }
        }
    }

    // Если все комбинации перебраны, и ни одна не сработала
    console.error("Все комбинации моделей и API вернули 404.");
    res.json({ reply: "ИИ временно недоступен. Ни одна модель не подошла." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Сервер работает на порту ${PORT}!`));
