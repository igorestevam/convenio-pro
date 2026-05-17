import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Atualiza o app automaticamente quando você subir código novo
      includeAssets: ['logo192x192', 'logo512x512'], // Os ícones que você colocou na pasta public
      manifest: {
        name: 'ConvênioPro',
        short_name: 'ConvênioPro',
        description: 'Controle de consumo de clientes',
        theme_color: '#4F46E5', // Cor da barra superior da janela (o índigo do seu layout)
        background_color: '#F4F3F0', // Cor de fundo antes de carregar
        display: 'standalone', // Faz abrir como um programa (sem a barra de endereço do Chrome)
        icons: [
          {
            src: '/logo192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})