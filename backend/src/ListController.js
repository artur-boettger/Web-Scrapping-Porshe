// listController.js
let list = []; // Certifique-se de usar let para permitir a modificação da lista

const index = (request, response) => {
    return response.json(list);
};

module.exports = {
    index,
    list, // Exporte a lista para ser usada no arquivo principal
};