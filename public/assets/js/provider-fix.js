// Fix for providers.html - Insert this script before the existing one

// URLs de proveedores
const PROVIDER_LOGIN_URLS = {
    cargill: "https://www.mycargill.com/cascsa/v2/login",
    ldc: "https://mildc.com/webportal",
    bunge: "https://operacionesbasa.bunge.ar/operacionesbasa/",
    cofco: "https://ar.cofcointernational.com/acceso-clientes",
    fyo: "https://www.fyodigital.com",
    aca: "https://www.acabase.com.ar/index.asp#"
};

// Override startProviderLogin to open URL directly
window.startProviderLogin = async function (provider, event) {
    const btn = event?.currentTarget || event?.target;
    const originalText = btn ? btn.innerText : 'Conectar';

    if (!PROVIDER_LOGIN_URLS[provider]) {
        alert(`❌ URL no configurada para ${provider}`);
        return;
    }

    try {
        // Abrir el proveedor en una nueva ventana/pestaña
        const providerWindow = window.open(
            PROVIDER_LOGIN_URLS[provider],
            `provider_${provider}`,
            'width=1200,height=800,menubar=yes,toolbar=yes,location=yes,status=yes,resizable=yes,scrollbars=yes'
        );

        if (!providerWindow) {
            alert('⚠️ El navegador bloqueó la ventana emergente.\\n\\nPor favor:\\n1. Permite ventanas emergentes para este sitio\\n2. Vuelve a intentar conectar');
            return;
        }

        alert(`✅ Ventana de ${provider.toUpperCase()} abierta\\n\\nInicia sesión en la nueva ventana que se abrió.\\nCuando termines, vuelve aquí y confirma la conexión.`);

        // Cambiar estado del botón
        if (btn) {
            btn.innerText = "Confirmar Conexión";
            btn.disabled = false;
            btn.style.opacity = "1";

            btn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`¿Ya iniciaste sesión exitosamente en ${provider.toUpperCase()}?`)) {
                    try {
                        // Marcar como conectado en el backend
                        await fetch('/api/providers/force-connect', {
                            method: 'POST',
                            headers: window.getAuthHeaders(),
                            body: JSON.stringify({ provider })
                        });
                        alert(`✅ Conexión confirmada con ${provider.toUpperCase()}`);
                        loadProviders(); // Recargar lista de proveedores
                    } catch (err) {
                        console.error(err);
                        alert("Error al confirmar conexión");
                    }
                }
            };
        }

    } catch (e) {
        console.error("Login Error", e);
        alert("❌ Error al abrir la ventana del proveedor.");
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
};
