import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'

/**
 * Генерирует документацию API для всех маршрутов
 */
export const apiDocs = (req: Request, res: Response) => {
    const apiDocsHTML = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Документация API Детекторов Безопасности</title>
        <style>
            body {
                font-family: 'Roboto', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            h1, h2, h3, h4 {
                color: #2c3e50;
            }
            h1 {
                text-align: center;
                border-bottom: 2px solid #3498db;
                padding-bottom: 10px;
                margin-bottom: 30px;
            }
            .endpoint {
                background-color: #fff;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .endpoint h2 {
                margin-top: 0;
                border-bottom: 1px solid #ddd;
                padding-bottom: 10px;
            }
            .method {
                display: inline-block;
                padding: 5px 10px;
                border-radius: 4px;
                font-weight: bold;
                margin-right: 10px;
            }
            .method.post {
                background-color: #4CAF50;
                color: white;
            }
            .method.get {
                background-color: #2196F3;
                color: white;
            }
            pre {
                background-color: #f8f8f8;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 15px;
                overflow-x: auto;
            }
            code {
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 14px;
            }
            .url {
                font-weight: bold;
                margin-left: 10px;
                color: #e74c3c;
            }
            .description {
                margin: 15px 0;
            }
            .tab {
                overflow: hidden;
                border: 1px solid #ccc;
                background-color: #f1f1f1;
                border-radius: 4px 4px 0 0;
            }
            .tab button {
                background-color: inherit;
                float: left;
                border: none;
                outline: none;
                cursor: pointer;
                padding: 10px 16px;
                transition: 0.3s;
                font-size: 14px;
            }
            .tab button:hover {
                background-color: #ddd;
            }
            .tab button.active {
                background-color: #3498db;
                color: white;
            }
            .tabcontent {
                display: none;
                padding: 20px;
                border: 1px solid #ccc;
                border-top: none;
                border-radius: 0 0 4px 4px;
                background-color: white;
            }
            .show {
                display: block;
            }
        </style>
    </head>
    <body>
        <h1>Документация API Детекторов Безопасности</h1>
        
        <div class="endpoint">
            <h2><span class="method post">POST</span><span class="url">/detect/rugpull</span></h2>
            <div class="description">
                <p>Обнаружение признаков ругпулла в транзакции. Проверяет на признаки потенциально опасной активности, которая может указывать на мошенничество.</p>
            </div>
            
            <div class="tab">
                <button class="tablinks active" onclick="openTab(event, 'rugpull-request')">Запрос</button>
                <button class="tablinks" onclick="openTab(event, 'rugpull-response')">Ответ</button>
            </div>
            
            <div id="rugpull-request" class="tabcontent show">
                <pre><code>{
  "trace": {
    "hash": "0x123abc...",
    "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "to": "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
    "value": "1000000000000000000",
    "input": "0x095ea7b3000000000000000000000000742d35cc6634c0532925a3b844bc454e4438f44effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "gasPrice": "5000000000",
    "logs": [
      {
        "address": "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
        "topics": [
          "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925"
        ],
        "data": "0x000000000000000000000000000000000000000000000000000000000000000a"
      }
    ]
  }
}</code></pre>
            </div>
            
            <div id="rugpull-response" class="tabcontent">
                <pre><code>{
  "findings": [
    {
      "name": "Потенциально подозрительное разрешение токенов",
      "description": "Обнаружено неограниченное разрешение на использование токенов",
      "alertId": "SUSPICIOUS-TOKEN-APPROVAL",
      "severity": "High",
      "type": "Suspicious",
      "metadata": {
        "owner": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "spender": "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
        "amount": "Unlimited"
      }
    }
  ]
}</code></pre>
            </div>
        </div>
        
        <div class="endpoint">
            <h2><span class="method post">POST</span><span class="url">/multisig-protection/detect</span></h2>
            <div class="description">
                <p>Обнаружение потенциальных проблем с мультиподписными кошельками. Анализирует транзакции на предмет изменений в настройках, необычных подписях или подозрительных действиях с мультиподписными кошельками.</p>
            </div>
            
            <div class="tab">
                <button class="tablinks active" onclick="openTab(event, 'multisig-request')">Запрос</button>
                <button class="tablinks" onclick="openTab(event, 'multisig-response')">Ответ</button>
            </div>
            
            <div id="multisig-request" class="tabcontent show">
                <pre><code>{
  "trace": {
    "hash": "0xabc123...",
    "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "to": "0x4E20Da132Dd5FD6Bdc1B3210e8E16C1D2Bba346d",
    "value": "0",
    "input": "0x173825d9000000000000000000000000f14984b6c5a12eb485d555aaa606ddfc1c916aa0",
    "gasPrice": "7000000000",
    "logs": [
      {
        "address": "0x4E20Da132Dd5FD6Bdc1B3210e8E16C1D2Bba346d",
        "topics": [
          "0xe9e05c42c24f96d67aa136e1d7ce4e42b29c35e24f8e3c284f02c85226938f1f"
        ],
        "data": "0x000000000000000000000000f14984b6c5a12eb485d555aaa606ddfc1c916aa0"
      }
    ]
  }
}</code></pre>
            </div>
            
            <div id="multisig-response" class="tabcontent">
                <pre><code>{
  "findings": [
    {
      "name": "Изменение владельца мультиподписного кошелька",
      "description": "Обнаружено добавление нового владельца в мультиподписный кошелек",
      "alertId": "MULTISIG-OWNER-CHANGE",
      "severity": "Medium",
      "type": "Info",
      "metadata": {
        "multisigAddress": "0x4E20Da132Dd5FD6Bdc1B3210e8E16C1D2Bba346d",
        "newOwner": "0xf14984b6c5a12eb485d555aaa606ddfc1c916aa0",
        "initiator": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
      }
    }
  ]
}</code></pre>
            </div>
        </div>
        
        <div class="endpoint">
            <h2><span class="method post">POST</span><span class="url">/phishing-detection/detect</span></h2>
            <div class="description">
                <p>Обнаружение признаков фишинговых атак в транзакциях. Анализирует взаимодействия на предмет известных фишинговых адресов или подозрительных шаблонов взаимодействия.</p>
            </div>
            
            <div class="tab">
                <button class="tablinks active" onclick="openTab(event, 'phishing-request')">Запрос</button>
                <button class="tablinks" onclick="openTab(event, 'phishing-response')">Ответ</button>
            </div>
            
            <div id="phishing-request" class="tabcontent show">
                <pre><code>{
  "trace": {
    "hash": "0xdef456...",
    "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "to": "0xb1A2B2CC8Ae63acdC863B207233D5A868FD6bAD5",
    "value": "500000000000000000",
    "input": "0xa9059cbb000000000000000000000000c70e1f2034564be85ad7a6d0b126dfc385b9eedc0000000000000000000000000000000000000000000000056bc75e2d63100000",
    "gasPrice": "10000000000",
    "logs": []
  }
}</code></pre>
            </div>
            
            <div id="phishing-response" class="tabcontent">
                <pre><code>{
  "findings": [
    {
      "name": "Потенциальный фишинговый адрес",
      "description": "Транзакция взаимодействует с подозрительным адресом, известным фишинговыми атаками",
      "alertId": "PHISHING-INTERACTION",
      "severity": "High",
      "type": "Suspicious",
      "metadata": {
        "suspiciousAddress": "0xb1A2B2CC8Ae63acdC863B207233D5A868FD6bAD5",
        "userAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "value": "0.5 ETH"
      }
    }
  ]
}</code></pre>
            </div>
        </div>
        
        <div class="endpoint">
            <h2><span class="method post">POST</span><span class="url">/mev-detection/detect</span></h2>
            <div class="description">
                <p>Обнаружение MEV-атак (максимальной извлекаемой ценности), таких как сэндвич-атаки, фронтраннинг и т.д. Анализирует транзакции на предмет признаков манипуляций с ценами.</p>
            </div>
            
            <div class="tab">
                <button class="tablinks active" onclick="openTab(event, 'mev-request')">Запрос</button>
                <button class="tablinks" onclick="openTab(event, 'mev-response')">Ответ</button>
            </div>
            
            <div id="mev-request" class="tabcontent show">
                <pre><code>{
  "trace": {
    "hash": "0xghi789...",
    "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "to": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    "value": "200000000000000000",
    "input": "0x7ff36ab5000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000742d35cc6634c0532925a3b844bc454e4438f44e00000000000000000000000000000000000000000000000000000000642af139000000000000000000000000000000000000000000000000000000000000000200000000000000000000000089ab32156e46f46d02ade3fecbe5fc4243b9aaed000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    "gasPrice": "25000000000",
    "logs": []
  }
}</code></pre>
            </div>
            
            <div id="mev-response" class="tabcontent">
                <pre><code>{
  "findings": [
    {
      "name": "Потенциальная MEV-атака",
      "description": "Обнаружены признаки потенциальной атаки типа сэндвич при обмене токенов",
      "alertId": "SANDWICH-ATTACK",
      "severity": "Medium",
      "type": "Suspicious",
      "metadata": {
        "router": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        "slippageTolerance": "Очень низкая (0.1%)",
        "gasPrice": "Аномально высокая",
        "victim": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
      }
    }
  ]
}</code></pre>
            </div>
        </div>
        
        <div class="endpoint">
            <h2><span class="method post">POST</span><span class="url">/approval-detection/detect</span></h2>
            <div class="description">
                <p>Обнаружение подозрительных разрешений токенов. Проверяет транзакции на наличие неограниченных разрешений, разрешений подозрительным контрактам и другие связанные риски.</p>
            </div>
            
            <div class="tab">
                <button class="tablinks active" onclick="openTab(event, 'approval-request')">Запрос</button>
                <button class="tablinks" onclick="openTab(event, 'approval-response')">Ответ</button>
            </div>
            
            <div id="approval-request" class="tabcontent show">
                <pre><code>{
  "trace": {
    "hash": "0xjkl012...",
    "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "to": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "value": "0",
    "input": "0x095ea7b3000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff00000000000000000000000000000000000000000000000000000000000003e8",
    "gasPrice": "15000000000",
    "logs": [
      {
        "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "topics": [
          "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925"
        ],
        "data": "0x00000000000000000000000000000000000000000000000000000000000003e8"
      }
    ]
  }
}</code></pre>
            </div>
            
            <div id="approval-response" class="tabcontent">
                <pre><code>{
  "findings": [
    {
      "name": "Подозрительное разрешение токенов",
      "description": "Обнаружено разрешение токенов для подозрительного контракта",
      "alertId": "SUSPICIOUS-TOKEN-APPROVAL",
      "severity": "Medium",
      "type": "Suspicious",
      "metadata": {
        "token": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "spender": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
        "owner": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "value": "1000",
        "tokenSymbol": "USDT"
      }
    }
  ]
}</code></pre>
            </div>
        </div>
        
        <div class="endpoint">
            <h2><span class="method post">POST</span><span class="url">/two-factor-auth/detect</span></h2>
            <div class="description">
                <p>Управление двухфакторной аутентификацией для высокорисковых операций. Анализирует транзакции на необходимость 2FA и проверяет статус аутентификации.</p>
            </div>
            
            <div class="tab">
                <button class="tablinks active" onclick="openTab(event, '2fa-request')">Запрос</button>
                <button class="tablinks" onclick="openTab(event, '2fa-response')">Ответ</button>
            </div>
            
            <div id="2fa-request" class="tabcontent show">
                <pre><code>{
  "trace": {
    "hash": "0xmno345...",
    "from": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "value": "0",
    "input": "0xa9059cbb0000000000000000000000002e7b6711e945b67086d6d9e3a5f5f3d2b34d2d1e0000000000000000000000000000000000000000000000000000000005f5e100",
    "gasPrice": "12000000000",
    "logs": [
      {
        "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "topics": [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
        ],
        "data": "0x0000000000000000000000000000000000000000000000000000000005f5e100"
      }
    ]
  }
}</code></pre>
            </div>
            
            <div id="2fa-response" class="tabcontent">
                <pre><code>{
  "findings": [
    {
      "name": "2FA Рекомендуется для пользователя",
      "description": "Пользователь выполнил высокорисковую транзакцию без включенной 2FA",
      "alertId": "2FA-RECOMMENDED-1",
      "severity": "Medium",
      "type": "Info",
      "metadata": {
        "user": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "value": "0",
        "operationType": "token_transfer",
        "txHash": "0xmno345..."
      }
    }
  ]
}</code></pre>
            </div>
        </div>
        
        <script>
        function openTab(evt, tabName) {
            var i, tabcontent, tablinks;
            // Get all elements with class="tabcontent" and hide them
            tabcontent = evt.currentTarget.parentElement.parentElement.getElementsByClassName("tabcontent");
            for (i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
                tabcontent[i].className = tabcontent[i].className.replace(" show", "");
            }
            
            // Get all elements with class="tablinks" and remove the class "active"
            tablinks = evt.currentTarget.parentElement.getElementsByClassName("tablinks");
            for (i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }
            
            // Show the current tab, and add an "active" class to the button that opened the tab
            document.getElementById(tabName).style.display = "block";
            document.getElementById(tabName).className += " show";
            evt.currentTarget.className += " active";
        }
        </script>
    </body>
    </html>
    `
    
    res.send(apiDocsHTML)
}
