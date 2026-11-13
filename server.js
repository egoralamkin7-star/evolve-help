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

// Новая функция: получаем список доступных моделей
async function getAvailableModels(accessToken) {
    try {
        const response = await axios.get('https://api.giga.chat/v1/models', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        // Возвращаем массив ID моделей
        return response.data.data.map(m => m.id);
    } catch (error) {
        console.error("Ошибка получения списка моделей:", error.response ? JSON.stringify(error.response.data) : error.message);
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

    // Получаем список моделей, доступных для этого ключа
    const availableModels = await getAvailableModels(accessToken);
    if (!availableModels || availableModels.length === 0) {
        return res.json({ reply: "Не удалось получить список доступных моделей." });
    }

    console.log(`Доступные модели для вашего ключа: ${availableModels.join(', ')}`);

    // Берем первую доступную модель
    const modelToUse = availableModels[0]; 

    try {
        const response = await axios.post('https://api.giga.chat/v1/chat/completions', {
            model: modelToUse,
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
        
        console.log(`✅ Успешный ответ от модели: ${modelToUse}`);
        res.json({ reply: response.data.choices[0].message.content });

    } catch (error) {
        const errorInfo = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`Критическая ошибка с моделью ${modelToUse}:`, errorInfo);
        res.json({ reply: "ИИ временно недоступен. Проверьте логи Netrun." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Сервер работает на порту ${PORT}!`));
