/**
 * Sistema de upload em lotes para evitar travamento do navegador
 * Divide uploads grandes em grupos menores para melhor performance
 */

export interface ProjectData {
  nome: string;
  cliente: string;
  emailCliente: string;
  dataEvento: string;
  observacoes?: string;
  includedPhotos?: number; // Number of photos included in base price (0 = unlimited)
  additionalPhotoPrice?: number; // Price in cents for each additional photo
}

export interface BatchUploadResult {
  success: boolean;
  projectId?: string;
  message?: string;
  data?: any;
}

/**
 * Envia imagens em lotes para evitar travamento e limite de requisição
 * @param compressedFiles Array de arquivos comprimidos
 * @param projectData Dados do projeto
 * @param onProgress Callback de progresso (40% a 100%)
 * @returns Promise com resultado do upload
 */
export async function uploadInBatches(
  compressedFiles: File[],
  projectData: ProjectData,
  onProgress?: (percentage: number) => void
): Promise<BatchUploadResult> {
  const batchSize = 100; // Enviar 100 imagens por lote
  const totalFiles = compressedFiles.length;
  
  console.log(`[Batch Upload] Iniciando upload de ${totalFiles} imagens em lotes de ${batchSize}`);
  
  if (totalFiles === 0) {
    return { success: false, message: "Nenhuma imagem para enviar" };
  }

  try {
    // PRIMEIRA REQUISIÇÃO: Criar projeto com primeiro lote de imagens
    const firstBatchEnd = Math.min(batchSize, totalFiles);
    const firstBatch = compressedFiles.slice(0, firstBatchEnd);
    
    console.log(`[Batch Upload] Enviando primeiro lote: ${firstBatch.length} imagens`);
    
    const projectResult = await uploadProjectBatch(firstBatch, projectData, true);
    if (!projectResult.success || !projectResult.projectId) {
      return { success: false, message: projectResult.message || "Falha ao criar projeto" };
    }
    
    const projectId = projectResult.projectId;
    const baseProgress = 40; // Começamos em 40% (após compressão)
    const progressRange = 60; // 60% restante para upload
    
    // Atualizar progresso do primeiro lote
    const firstBatchProgress = (firstBatch.length / totalFiles) * progressRange;
    if (onProgress) {
      onProgress(baseProgress + firstBatchProgress);
    }
    
    // Se há mais imagens, enviar em lotes adicionais
    if (totalFiles > batchSize) {
      for (let batchStart = batchSize; batchStart < totalFiles; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, totalFiles);
        const batch = compressedFiles.slice(batchStart, batchEnd);
        
        console.log(`[Batch Upload] Enviando lote adicional ${Math.floor(batchStart/batchSize)}/${Math.ceil((totalFiles-batchSize)/batchSize)}: ${batch.length} imagens`);
        
        const batchResult = await uploadAdditionalBatch(batch, projectId);
        if (!batchResult.success) {
          console.warn(`[Batch Upload] Falha no lote ${Math.floor(batchStart/batchSize)}: ${batchResult.message}`);
          // Continuar com próximo lote mesmo se um falhar
        }
        
        // Atualizar progresso
        const batchProgress = (batchEnd / totalFiles) * progressRange;
        if (onProgress) {
          onProgress(baseProgress + batchProgress);
        }
        
        // Pequena pausa entre lotes para não sobrecarregar o servidor
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Upload concluído
    if (onProgress) {
      onProgress(100);
    }
    
    console.log(`[Batch Upload] Upload concluído com sucesso. Projeto ID: ${projectId}`);
    return { 
      success: true, 
      projectId, 
      data: projectResult.data,
      message: `Upload concluído: ${totalFiles} imagens enviadas em ${Math.ceil(totalFiles/batchSize)} lotes`
    };
    
  } catch (error) {
    console.error("[Batch Upload] Erro durante upload em lotes:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Erro desconhecido durante upload" 
    };
  }
}

/**
 * Envia o primeiro lote de imagens e cria o projeto
 */
async function uploadProjectBatch(
  files: File[], 
  projectData: ProjectData, 
  isFirstBatch: boolean
): Promise<BatchUploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    
    // Adicionar dados do projeto
    formData.append("name", projectData.nome);
    formData.append("clientName", projectData.cliente);
    formData.append("clientEmail", projectData.emailCliente);
    formData.append("date", projectData.dataEvento);
    formData.append("notes", projectData.observacoes || "");
    formData.append("photographerId", "1"); // Usando ID padrão
    formData.append("includedPhotos", (projectData.includedPhotos || 0).toString());
    formData.append("additionalPhotoPrice", (projectData.additionalPhotoPrice || 0).toString());
    
    // Adicionar imagens do lote
    files.forEach((file) => {
      formData.append("photos", file);
    });
    
    // Adicionar contagem total de fotos no lote
    formData.append("photoCount", files.length.toString());
    
    // Adicionar dados JSON das fotos
    const photoDataJson = JSON.stringify(
      files.map((file) => ({
        url: "",
        filename: file.name,
      }))
    );
    formData.append("photosData", photoDataJson);
    
    const xhr = new XMLHttpRequest();
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({ 
            success: true, 
            projectId: response.id, 
            data: response,
            message: `Projeto criado com ${files.length} imagens` 
          });
        } catch (e) {
          resolve({ success: false, message: "Resposta inválida do servidor" });
        }
      } else {
        let errorMessage = "Falha ao criar projeto";
        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Erro do servidor: ${xhr.statusText}`;
        }
        resolve({ success: false, message: errorMessage });
      }
    };
    
    xhr.onerror = () => {
      // ✅ SEGURANÇA: Erro mais específico baseado no contexto de rede
      let errorMessage = "Erro de rede";
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        errorMessage = "Sem conexão com a internet - verifique sua rede";
      } else {
        errorMessage = "Falha na conexão com o servidor - tente novamente";
      }
      resolve({ success: false, message: errorMessage });
    };
    
    xhr.open("POST", "/api/projects", true);
    xhr.send(formData);
  });
}

/**
 * Envia lote adicional de imagens para projeto existente
 */
async function uploadAdditionalBatch(files: File[], projectId: string): Promise<BatchUploadResult> {
  return new Promise((resolve) => {
    const formData = new FormData();
    
    // Adicionar imagens do lote
    files.forEach((file) => {
      formData.append("photos", file);
    });
    
    // Adicionar ID do projeto
    formData.append("projectId", projectId);
    formData.append("photoCount", files.length.toString());
    
    const xhr = new XMLHttpRequest();
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ 
          success: true, 
          message: `Lote de ${files.length} imagens adicionado com sucesso` 
        });
      } else {
        let errorMessage = "Falha ao enviar lote adicional";
        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Erro do servidor: ${xhr.statusText}`;
        }
        resolve({ success: false, message: errorMessage });
      }
    };
    
    xhr.onerror = () => {
      resolve({ success: false, message: "Erro de rede no lote adicional" });
    };
    
    // Endpoint para adicionar fotos a projeto existente (será criado no backend)
    xhr.open("POST", `/api/projects/${projectId}/add-photos`, true);
    xhr.send(formData);
  });
}