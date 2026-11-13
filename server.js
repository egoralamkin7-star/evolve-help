const express = require('express');
const axios = require('axios');
const fs = require('fs'); // Модуль для чтения файлов
const path = require('path');
const app = express();

const DEFAULT_PROMPT = "Ты — умный помощник на сервере GTA SA:MP Evolve RP. Отвечай кратко и по делу.";

app.get('/api/chat', async (req, res) => {
    const userMessage = req.query.message;
    const category = req.query.cat || 'base'; // По умолчанию читаем base.txt
    
    if (!userMessage) return res.send("Вы ничего не спросили.");

    let knowledgeBase = DEFAULT_PROMPT;

    // Пытаемся прочитать нужный файл
    try {
        const filePath = path.join(__dirname, `${category}.txt`);
        if (fs.existsSync(filePath)) {
            knowledgeBase = fs.readFileSync(filePath, 'utf8');
        } else {
            console.log(`Файл ${category}.txt не найден, использую базу по умолчанию.`);
        }
    } catch (error) {
        console.error("Ошибка чтения файла:", error.message);
    }

    try {
        const response = await axios.post('https://text.pollinations.ai/openai', {
            model: "mistral", 
            messages: [
                { role: "system", content: knowledgeBase },
                { role: "user", content: userMessage }
            ]
        }, { timeout: 25000 }); 
        
        res.send(response.data.choices[0].message.content);
        
    } catch (error) {
        console.error("Ошибка Pollinations:", error.message);
        res.send("Ошибка: ИИ временно недоступен. Попробуйте позже.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Сервер работает на порту ${PORT}!`));
