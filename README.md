# 📱 SAE RA - Experiência de Realidade Aumentada

Uma experiência AR simples usando A-Frame e AR.js com servidor Node.js.

## 🚀 Características

- 📹 **Câmera em tempo real** - Usa a câmera do dispositivo
- 🎯 **Objetos 3D interativos** - Esferas, cubos e torus flutuando no espaço
- 🎮 **Animações suaves** - Rotação, flutuação e efeitos visuais
- 👆 **Interatividade** - Toque nos objetos para efeitos especiais
- 📱 **Responsivo** - Funciona em desktop e mobile

## 🛠️ Instalação

1. **Instalar dependências**:
```bash
npm install
```

2. **Iniciar o servidor**:
```bash
npm start
```

3. **Acessar a aplicação**:
   - Desktop: `http://localhost:3000`
   - Mobile: Use o IP da rede local ou configure HTTPS

## 📋 Como Usar

### Para Desktop:
1. Abra `http://localhost:3000` no navegador
2. Permita acesso à câmera quando solicitado
3. Imprima o [Marker Hiro](https://ar-js-org.github.io/AR.js/data/images/hiro.png)
4. Aponte a câmera para o marker impresso

### Para Mobile:
1. Conecte o celular na mesma rede WiFi
2. Acesse o IP local (ex: `http://192.168.1.100:3000`)
3. Permita acesso à câmera
4. Aponte para o marker Hiro

## 🎮 Objetos na Cena

- **3 Esferas vermelhas** - Com diferentes animações de rotação e flutuação
- **3 Cubos coloridos** - Verde-água e amarelo com movimentos únicos
- **1 Torus roxo** - Objeto adicional para mais interatividade

Todos os objetos:
- ✨ Possuem animações contínuas
- 👆 São interativos ao toque/clique
- 🎨 Mudam de cor temporariamente quando clicados
- 📏 Aumentam de tamanho ao passar o mouse/toque

## 🔧 Tecnologias

- **A-Frame 1.4.0** - Framework WebXR
- **AR.js 3.4.5** - Biblioteca de realidade aumentada
- **Express.js** - Servidor web Node.js
- **WebRTC** - Acesso à câmera do dispositivo

## 📱 Compatibilidade

- ✅ Chrome/Edge (Desktop e Mobile)
- ✅ Safari (Mobile - iOS 11+)
- ✅ Firefox (Desktop e Mobile)
- ❌ Internet Explorer (não suportado)

## 🔍 Troubleshooting

### Câmera não funciona:
- Verifique permissões do navegador
- Certifique-se que está em HTTPS ou localhost
- Tente outro navegador

### Objetos não aparecem:
- Verifique se o marker Hiro está visível
- Melhore a iluminação do ambiente
- Certifique-se que o marker está plano e bem impresso

### Performance lenta:
- Feche outros aplicativos
- Use um dispositivo mais potente
- Reduza a qualidade da câmera nas configurações do navegador

## 🎯 Próximos Passos

- [ ] Adicionar mais tipos de objetos 3D
- [ ] Implementar reconhecimento sem marker
- [ ] Adicionar sons e efeitos
- [ ] Criar sistema de pontuação
- [ ] Multiplayer online

## 🤝 Contribuição

Sinta-se livre para contribuir com melhorias, correções ou novas funcionalidades!

---

**Desenvolvido para SAE RA Experience** 🚀 