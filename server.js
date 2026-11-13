process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
const express = require('express');
const axios = require('axios');
const { randomUUID } = require('crypto');
const app = express();

// Ваша база знаний
const KNOWLEDGE_BASE = `
Вы - умный помощник на сервере GTA SA:MP Evolve RP. 
Отвечайте кратко, дружелюбно и по делу. 
Знания: 
- Как стать полицейским: Подать заявку на форуме в разделе Правительство.
- Где купить машину: Автосалоны отмечены на карте (GPS).
`;

// Ключ берется из настроек Netrun
const GIGACHAT_AUTH_KEY = process.env.GIGACHAT_AUTH_KEY; 

// Список всех возможных моделей для перебора
const MODELS_TO_TRY = [
    "GigaChat-2", 
    "GigaChat-3-Ultra", 
    "GigaChat-2-Max", 
    "GigaChat-2-Pro",
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
        console.error("Ошибка получения токена:", error.response ? error.response.data : error.message);
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
            
            // Если дошли сюда - значит модель сработала! Отправляем ответ в игру.
            console.log(`Успешный ответ от модели: ${modelName}`);
            return res.json({ reply: response.data.choices[0].message.content });

        } catch (error) {
            // Если ошибка 404 (модель не найдена) - просто идем к следующей в списке
            if (error.response && error.response.status === 404) {
                console.log(`Модель ${modelName} не найдена на аккаунте, пробуем следующую...`);
                continue; 
            } else {
                // Если ошибка другая (например, кончились токены) - выводим в лог и останавливаемся
                console.error(`Критическая ошибка с моделью ${modelName}:`, error.response ? JSON.stringify(error.response.data) : error.message);
                return res.json({ reply: "Ошибка на стороне ИИ. Проверьте баланс токенов или логи." });
            }
        }
    }

    // Если перебрали все модели и ни одна не подошла
    console.error("Все доступные модели вернули 404. Возможно, у ключа нет доступа к чат-моделям.");
    res.json({ reply: "ИИ временно недоступен (ни одна модель не подошла)." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Сервер работает на порту ${PORT}!`));
