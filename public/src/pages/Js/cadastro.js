// Validação e processamento do formulário de cadastro

document.addEventListener('DOMContentLoaded', function() {
  // Elementos do DOM
  const cadastroForm = document.getElementById('cadastroForm');
  const mensagemCadastro = document.getElementById('mensagemCadastro');
  const submitBtn = document.getElementById('btnCadastro');
  
  // Validação em tempo real
  const inputs = document.querySelectorAll('.form-input');
  
  inputs.forEach(input => {
    // Validação ao perder o foco
    input.addEventListener('blur', function() {
      validateField(this);
    });
    
    // Validação enquanto digita (para senha)
    if (input.type === 'password') {
      input.addEventListener('input', function() {
        validatePassword(this);
      });
    }
  });
  
  // Função de validação de campo
  function validateField(field) {
    const value = field.value.trim();
    const fieldId = field.id;
    
    // Remove classe de erro anterior
    field.classList.remove('error');
    
    // Validações específicas por campo
    switch(fieldId) {
      case 'nomeClubeCadastro':
        if (value.length < 3) {
          showError(field, 'Nome do clube deve ter pelo menos 3 caracteres');
          return false;
        }
        break;
        
      case 'emailCadastro':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          showError(field, 'Por favor, insira um email válido');
          return false;
        }
        break;
        
      case 'idadeCadastro':
        const idade = parseInt(value);
        if (isNaN(idade) || idade < 16 || idade > 99) {
          showError(field, 'Idade deve estar entre 16 e 99 anos');
          return false;
        }
        break;
        
      case 'bairroCadastro':
        if (value.length < 2) {
          showError(field, 'Por favor, insira um bairro válido');
          return false;
        }
        break;
        
      case 'senhaCadastro':
        if (value.length < 8) {
          showError(field, 'A senha deve ter pelo menos 8 caracteres');
          return false;
        }
        break;
    }
    
    // Se passou na validação
    showSuccess(field);
    return true;
  }
  
  // Validação específica para senha
  function validatePassword(field) {
    const password = field.value;
    
    // Remove classe de erro anterior
    field.classList.remove('error');
    
    if (password.length > 0 && password.length < 8) {
      showError(field, 'A senha deve ter pelo menos 8 caracteres');
      return false;
    }
    
    showSuccess(field);
    return true;
  }
  
  // Mostrar erro no campo
  function showError(field, message) {
    field.classList.add('error');
    
    // Remove mensagem de erro anterior
    let errorMsg = field.parentElement.querySelector('.error-message');
    if (!errorMsg) {
      errorMsg = document.createElement('div');
      errorMsg.className = 'error-message';
      field.parentElement.appendChild(errorMsg);
    }
    
    errorMsg.textContent = message;
    errorMsg.style.color = 'var(--danger)';
    errorMsg.style.fontSize = '0.85rem';
    errorMsg.style.marginTop = '0.25rem';
  }
  
  // Mostrar sucesso no campo
  function showSuccess(field) {
    field.classList.remove('error');
    
    // Remove mensagem de erro se existir
    const errorMsg = field.parentElement.querySelector('.error-message');
    if (errorMsg) {
      errorMsg.remove();
    }
  }
  
  // Função para mostrar mensagens
  function showMessage(message, type = 'success') {
    mensagemCadastro.textContent = message;
    mensagemCadastro.className = `message-box ${type}`;
    mensagemCadastro.style.display = 'block';
    
    // Auto-esconder após 5 segundos
    setTimeout(() => {
      mensagemCadastro.style.display = 'none';
    }, 5000);
  }
  
  // Processar formulário
  if (cadastroForm) {
    cadastroForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Validar todos os campos
      let isValid = true;
      const campos = [
        'nomeClubeCadastro',
        'emailCadastro',
        'idadeCadastro',
        'bairroCadastro',
        'senhaCadastro'
      ];
      
      campos.forEach(campoId => {
        const field = document.getElementById(campoId);
        if (!validateField(field)) {
          isValid = false;
        }
      });
      
      // Verificar termos
      const termos = document.getElementById('termosCadastro');
      if (!termos.checked) {
        showMessage('Você deve aceitar os termos e condições', 'error');
        isValid = false;
      }
      
      if (!isValid) {
        showMessage('Por favor, corrija os erros no formulário', 'error');
        return;
      }
      
      // Desabilitar botão durante o processamento
      submitBtn.disabled = true;
      const originalText = submitBtn.querySelector('.btn-text').textContent;
      submitBtn.querySelector('.btn-text').textContent = 'Processando...';
      
      try {
        // Aqui você faria a chamada para o backend
        // Por enquanto, simular uma requisição
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simular sucesso
        showMessage('Conta criada com sucesso! Redirecionando...', 'success');
        
        // Resetar formulário
        cadastroForm.reset();
        
        // Redirecionar após 2 segundos
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
        
      } catch (error) {
        showMessage('Erro ao criar conta. Tente novamente.', 'error');
      } finally {
        // Reabilitar botão
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').textContent = originalText;
      }
    });
  }
  
  // Validação de email duplicado (simulação)
  const emailField = document.getElementById('emailCadastro');
  if (emailField) {
    emailField.addEventListener('blur', async function() {
      const email = this.value.trim();
      
      if (email && this.checkValidity()) {
        // Simular verificação de email existente
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Emails "ocupados" para demonstração
        const takenEmails = ['admin@powerplay.com', 'teste@teste.com'];
        
        if (takenEmails.includes(email.toLowerCase())) {
          showError(this, 'Este email já está em uso');
        }
      }
    });
  }
});