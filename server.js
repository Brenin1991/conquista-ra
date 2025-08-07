const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📱 Acesse: http://localhost:${PORT}`);
    console.log(`🌐 Acesse na rede: http://[seu-ip]:${PORT}`);
    console.log(`📋 Para usar AR, acesse pelo celular em HTTPS ou pela rede local`);
}); 