import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/BotequimNaMao_with_Foundation/',
    root: 'src',
    publicDir: '../public',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/index.html'),
                cardapio: resolve(__dirname, 'src/cardapio.html'),
                sobre: resolve(__dirname, 'src/sobre.html'),
                produto: resolve(__dirname, 'src/produto.html'),
                carrinho: resolve(__dirname, 'src/carrinho.html'),
                login: resolve(__dirname, 'src/login.html'),
                gestao: resolve(__dirname, 'src/gestao.html')
            }
        }
    }
});
