# Jogo da Glória Online ❤️🎲

Jogo online de casal com tabuleiro de 50 casas, fotografia personalizada, dados, peões, salas privadas, chat e suporte WebRTC para câmara/microfone.

## Publicar no GitHub e Render

1. Cria um repositório novo no GitHub chamado `jogo-da-gloria-online`.
2. Extrai este ZIP e envia todos os ficheiros e a pasta `public` para a raiz do repositório.
3. No Render, cria um **Web Service** ligado ao repositório.
4. Configura:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Em **Environment → Environment Variables**, adiciona:
   - Key: `ADMIN_PASSWORD`
   - Value: escolhe uma palavra-passe privada tua (não a partilhes no código).
6. Faz deploy e abre o endereço do serviço.

## Como jogar

- O Alberto cria a mesa com a palavra-passe de administrador.
- Copia o link da sala e envia à Bernardete pelo WhatsApp.
- A Bernardete abre o link, escreve o nome e entra.
- À vez, cada jogador carrega em **Lançar o dado**.
- O jogo tem 50 casas, perguntas e desafios românticos, chat e botões de câmara/microfone.
- A câmara e o microfone precisam de permissão do navegador e de HTTPS (o Render fornece HTTPS).

## Nota importante

Esta é a primeira versão funcional para testar. O serviço usa memória do servidor para as salas: se o Render reiniciar, as salas abertas desaparecem e será preciso criar outra. A câmara/microfone usa WebRTC e pode depender da rede/firewall de cada jogador.
