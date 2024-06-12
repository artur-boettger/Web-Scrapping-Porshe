const express = require('express');
const puppeteer = require('puppeteer');
const listController = require('./listController'); // Importe o controlador

const app = express();
app.use(express.json()); // Middleware para interpretar JSON

const url = "https://www.mercadolivre.com.br/";
const searchFor = "Porsche conversível 2010";

const maxPagesToScrape = 48;
const maxConcurrentTabs = 48;

// Rota para expor a lista de objetos
app.get('/api/list', listController.index);

app.listen(3000, async () => {
    try {
        // headless false para ver o código fazendo a consulta
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        console.log('Entrando na página');

        await page.goto(url);
        console.log("Coletando dados...");

        await page.waitForSelector('#cb1-edit');

        await page.type('#cb1-edit', searchFor);

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('.nav-search-btn')
        ]);

        let pageNumber = 1;

        while (pageNumber <= maxPagesToScrape) {
            const links = await page.$$eval('.ui-search-item__group > a', els => els.map(link => link.href));

            for (let i = 0; i < links.length; i += maxConcurrentTabs) {
                const chunk = links.slice(i, i + maxConcurrentTabs);

                const scrapePromises = chunk.map(async link => {
                    const newPage = await browser.newPage();
                    await newPage.goto(link);
                    await newPage.waitForSelector('.ui-pdp-title');

                    const title = await newPage.$eval('.ui-pdp-title', element => element.innerText);
                    const price = await newPage.$eval('.andes-money-amount__fraction', element => element.innerText);

                    const seller = await newPage.evaluate(() => {
                        const el = document.querySelector('.ui-pdp-seller__brand-title-container');
                        return el ? el.innerText : null;
                    });

                    const obj = {
                        title,
                        price,
                        link,
                    };

                    if (seller) obj.seller = seller;

                    listController.list.push(obj); // Adicione o objeto à lista no controlador

                    await newPage.close();
                });

                await Promise.all(scrapePromises);
            }

            // Checa se botão de next é clicável
            const hasNextPage = await page.evaluate(() => {
                const nextButton = document.querySelector('.andes-pagination__button--next');
                return nextButton && !nextButton.hasAttribute('disabled');
            });

            if (hasNextPage) {
                try {
                    const nextButton = await page.$('.andes-pagination__button--next');
                    if (nextButton) {
                        await page.waitForTimeout(2000);
                        await Promise.all([
                            page.waitForNavigation({ waitUntil: 'networkidle0' }),
                            nextButton.click()
                        ]);
                        pageNumber++;
                    } else {
                        break;
                    }
                } catch (error) {
                    break;  // Sai do loop se não conseguir clicar no botão de next page
                }
            } else {
                break;
            }
        }
        await browser.close();
    } catch (error) {
        console.error('Erro ao coletar dados:', error);
    }
});
