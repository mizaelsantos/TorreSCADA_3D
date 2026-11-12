# Torre de Resfriamento: supervisório 3D

Projeto Integrador do curso Técnico em Automação Industrial (SENAI / FATEC SENAI, Três Lagoas, MS, 2026).
Autores: Carlos Henrique Maciel Ramires, Julio Cesar de Souza Pedro e Mizael Oliveira dos Santos.
Orientadora: Profa. Andressa Helena Melo Costa.

**Acesse:** https://mizaelsantos.github.io/torre-resfriamento/](https://mizaelsantos.github.io/TorreSCADA_3D/

O supervisório roda inteiro no navegador, sem instalar nada:

- **No computador (Chrome ou Edge):** escolha **Arduino via USB (Web Serial)**, clique em **Conectar** e selecione a porta do Arduino. O Arduino precisa estar com o firmware v3 (`arduino/torre_resfriamento`, 115200 baud).
- **No celular ou em outro navegador:** escolha **Simulador (sem placa)**. Ele usa a mesma lógica do firmware.

## Lógica de controle (firmware v3)

| Estado | LED | Ventoinha | Transição |
|---|---|---|---|
| Desligado | Amarelo (D6) | parada (PWM 0) | vai para normal quando T ≥ 20 °C |
| Normal | Verde (D5) | 70 % a 100 %, proporcional à temperatura | desliga quando T < 18 °C; máxima quando T ≥ 35 °C |
| Máxima | Vermelho (D7) | 100 % (PWM 255) | volta ao normal quando T ≤ 33 °C |

Modos de operação: **local** (temperatura pelo potenciômetro), **remoto** (temperatura definida na tela) e **manual** (velocidade da ventoinha definida na tela). Sem comandos por 5 s, o Arduino volta sozinho para o modo local.

## Arquivos

- `index.html`, `app.js`, `style.css`, `tower3d.js`: interface e torre 3D (Three.js em `vendor/`).
- `navegador.js`: substitui o servidor Python da versão de PC (Web Serial e simulador).
- `arduino/torre_resfriamento/torre_resfriamento.ino`: firmware v3.
- `dados/simulacao_15min_firmware_v3.csv`: simulação de 15 min nos modos local, remoto e manual.

Web Serial só funciona em página HTTPS (como o GitHub Pages) no Chrome ou Edge de computador.
