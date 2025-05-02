// Função para atualizar o arquivo routes.ts
// Parte do código que precisa ser modificada:

1. Adicionar variável shouldApplyWatermark após a linha 1242:
```typescript
      // Parse watermark setting (convert string "true"/"false" to boolean)
      const shouldApplyWatermark = applyWatermark === "false" ? false : true;
```

2. Modificar a chamada do upload na linha 1375:
```typescript
            const result = await uploadFileToR2(
              file.buffer,
              filename,
              file.mimetype,
              shouldApplyWatermark
            );
```

3. Instruções de teste:
- No frontend, o checkbox definirá applyWatermark como "true" ou "false"
- O backend converterá para booleano
- A função uploadFileToR2 receberá esse booleano
- O processamento de imagem respeitará essa configuração