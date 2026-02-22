import API from './api';

export interface ProviderConfig {
    id: string;
    name: string;
    logo: string;
    color: string;
    initials: string;
    filter?: string;
    loginUrl?: string; // For inline fix
}

export const PROVIDERS: Record<string, ProviderConfig> = {
    cargill: {
        id: 'cargill',
        name: "Cargill",
        logo: "/images/logos/cargill.png",
        color: "#419641",
        initials: "CA",
        loginUrl: "https://www.mycargill.com/cascsa/v2/login"
    },
    ldc: {
        id: 'ldc',
        name: "LDC",
        logo: "/images/logos/ldc.png",
        color: "#004D71",
        initials: "LD",
        loginUrl: "https://mildc.com/webportal"
    },
    bunge: {
        id: 'bunge',
        name: "Bunge",
        logo: "/images/logos/bunge.png",
        color: "#002D6E",
        initials: "BU",
        loginUrl: "https://operacionesbasa.bunge.ar/operacionesbasa/"
    },
    cofco: {
        id: 'cofco',
        name: "COFCO",
        logo: "/images/logos/cofco.svg?v=1",
        color: "#004D71",
        initials: "CO",
        filter: "brightness(0) saturate(100%) invert(31%) sepia(91%) saturate(1450%) hue-rotate(189deg) brightness(88%) contrast(92%)",
        loginUrl: "https://ar.cofcointernational.com/acceso-clientes"
    },
    fyo: {
        id: 'fyo',
        name: "FyO",
        logo: "/images/logos/fyo.png",
        color: "#002D6E",
        initials: "FyO",
        loginUrl: "https://www.fyodigital.com"
    },
    aca: {
        id: 'aca',
        name: "ACA",
        logo: "/images/logos/aca.png",
        color: "#004B87",
        initials: "ACA",
        loginUrl: "https://www.acabase.com.ar/index.asp#"
    }
};

export const ProviderUtils = {
    openProviderWindow: (providerId: string) => {
        const provider = PROVIDERS[providerId];
        if (!provider || !provider.loginUrl) {
            alert(`URL no configurada para ${providerId}`);
            return null;
        }

        const width = 1200;
        const height = 800;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        return window.open(
            provider.loginUrl,
            `provider_${providerId}`,
            `width=${width},height=${height},menubar=yes,toolbar=yes,location=yes,status=yes,resizable=yes,scrollbars=yes,top=${top},left=${left}`
        );
    },

    connectProvider: async (providerId: string) => {
        return API.post('/providers/connect', { provider: providerId });
    },

    forceConnect: async (providerId: string) => {
        return API.post('/providers/force-connect', { provider: providerId });
    },

    disconnect: async (providerId: string) => {
        return API.delete(`/providers/delete/${providerId}`);
    },

    listProviders: async () => {
        return API.get('/providers/list');
    }
};
