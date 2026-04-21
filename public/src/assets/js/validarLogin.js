
    document.addEventListener('DOMContentLoaded', function() {
      // Elementos principais
      const form = document.getElementById('formularioLogin');
      const toggleSenhaBtn = document.getElementById('toggleSenha');
      const senhaInput = document.getElementById('senhaLogin');
      const mensagem = document.getElementById('mensagemLogin');
      const rememberCheckbox = document.getElementById('rememberCheckbox');
      const rememberMe = document.getElementById('rememberMe');
      const btnLogin = document.getElementById('btnLogin');
      
      // Toggle visibilidade da senha
      if (toggleSenhaBtn && senhaInput) {
        toggleSenhaBtn.addEventListener('click', function() {
          const type = senhaInput.type === 'password' ? 'text' : 'password';
          senhaInput.type = type;
          const icon = this.querySelector('i');
          icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        });
      }
      
      // Lembrar-me checkbox
      if (rememberCheckbox && rememberMe) {
        rememberMe.addEventListener('click', function() {
          rememberCheckbox.classList.toggle('checked');
        });
      }
      
      // Função para mostrar mensagem
      function mostrarMensagem(texto, tipo = 'success') {
        if (!mensagem) return;
        
        mensagem.textContent = texto;
        mensagem.className = `message-box ${tipo}`;
        mensagem.style.display = 'block';
        
        // Auto-esconder após 5 segundos
        setTimeout(() => {
          mensagem.style.display = 'none';
        }, 5000);
      }
      
      // Validação do formulário
      function validarLogin() {
        const identificacao = document.getElementById('identificacaoLogin').value.trim();
        const senha = senhaInput.value.trim();
        
        if (!identificacao) {
          mostrarMensagem('Por favor, insira seu nome de clube ou email', 'error');
          return false;
        }
        
        if (!senha) {
          mostrarMensagem('Por favor, insira sua senha', 'error');
          return false;
        }
        
        if (senha.length < 6) {
          mostrarMensagem('A senha deve ter pelo menos 6 caracteres', 'error');
          return false;
        }
        
        return true;
      }
      
    });