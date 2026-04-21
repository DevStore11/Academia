 
    document.addEventListener('DOMContentLoaded', function() {
      // Elementos
      const form = document.getElementById('cadastroForm');
      const toggleBtn = document.getElementById('toggleSenha');
      const senhaInput = document.getElementById('senha');
      const mensagem = document.getElementById('mensagem');

      // Toggle senha
      if (toggleBtn && senhaInput) {
        toggleBtn.addEventListener('click', function() {
          const type = senhaInput.getAttribute('type') === 'password' ? 'text' : 'password';
          senhaInput.setAttribute('type', type);
          this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
      }

      // Mostrar mensagem
      function mostrarMensagem(texto, tipo = 'success') {
        mensagem.textContent = texto;
        mensagem.className = `mensagem ${tipo}`;
        mensagem.style.display = 'block';
        
        setTimeout(() => {
          mensagem.style.display = 'none';
        }, 5000);
      }

      // Validação simples
      function validarFormulario() {
        const nome = document.getElementById('nomeClube').value.trim();
        const email = document.getElementById('email').value.trim();
        const idade = parseInt(document.getElementById('idade').value);
        const bairro = document.getElementById('bairro').value.trim();
        const senha = document.getElementById('senha').value;
        const termos = document.getElementById('termos').checked;

        // Validações
        if (nome.length < 3) {
          mostrarMensagem('Nome do clube deve ter pelo menos 3 caracteres', 'error');
          return false;
        }

        if (!email.includes('@') || !email.includes('.')) {
          mostrarMensagem('Por favor, insira um email válido', 'error');
          return false;
        }

        if (isNaN(idade) || idade < 7 || idade > 99) {
          mostrarMensagem('Idade deve estar entre 16 e 99 anos', 'error');
          return false;
        }

        if (bairro.length < 2) {
          mostrarMensagem('Por favor, insira um bairro válido', 'error');
          return false;
        }

        if (senha.length < 8) {
          mostrarMensagem('A senha deve ter pelo menos 8 caracteres', 'error');
          return false;
        }

        if (!termos) {
          mostrarMensagem('Você deve aceitar os termos e condições', 'error');
          return false;
        }

        return true;
      }

      // Submissão do formulário
      if (form) {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          
          // Validar
          if (!validarFormulario()) {
            return;
          }

          // Botão loading
          const btn = form.querySelector('.submit-btn');
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Processando...</span>';
          btn.disabled = true;

          // Simular envio (substituir por chamada real)
          setTimeout(() => {
            // Sucesso
            mostrarMensagem('Conta criada com sucesso! Redirecionando...', 'success');
            
            // Resetar formulário
            form.reset();
            
            // Redirecionar após 2 segundos
            setTimeout(() => {
              window.location.href = 'login.html';
            }, 2000);

            // Restaurar botão
            btn.innerHTML = originalHTML;
            btn.disabled = false;
          }, 1500);
        });
      }

      // Validação em tempo real
      const inputs = form.querySelectorAll('input');
      inputs.forEach(input => {
        input.addEventListener('blur', function() {
          if (this.value.trim() !== '') {
            this.style.borderColor = '#00cc6a';
          } else {
            this.style.borderColor = '#333';
          }
        });
      });
    });
  



    document.addEventListener("DOMContentLoaded", () => {
  const formLogin = document.getElementById("formularioLogin");
  const btnGoogle = document.getElementById("btnGoogle");

  if (formLogin) formLogin.addEventListener("submit", efectuarLogin);
  if (btnGoogle) btnGoogle.addEventListener("click", loginComGoogle);

  const toggleSenha = document.getElementById("toggleSenha");
  const senhaInput = document.getElementById("senhaLogin");
  if (toggleSenha && senhaInput) {
    toggleSenha.addEventListener("click", () => {
      senhaInput.type = senhaInput.type === "password" ? "text" : "password";
      toggleSenha.innerHTML = senhaInput.type === "password" 
        ? '<i class="fas fa-eye"></i>' 
        : '<i class="fas fa-eye-slash"></i>';
    });
  }
});
