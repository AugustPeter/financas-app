/**
 * js/connection-monitor.js
 * Monitor de conexão com Supabase
 * Detecta desconexões, sincroniza dados automaticamente e oferece retry
 */

console.log('🔗 connection-monitor.js carregado');

const ConnectionMonitor = {
    // Estado
    isOnline: navigator.onLine,
    isConnectedToSupabase: false,
    lastSuccessfulSync: null,
    heartbeatInterval: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000, // 3 segundos
    
    // Callbacks
    onConnectionLost: null,
    onConnectionRestored: null,
    onSyncRequired: null,
    
    /**
     * Inicializar monitor
     */
    init() {
        console.log('🚀 Inicializando Connection Monitor...');
        
        // Monitorar status online/offline do navegador
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Antes de descarregar página (F5 ou fechar), tentar salvar
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
        
        // Iniciar heartbeat
        this.startHeartbeat();
        
        console.log('✅ Connection Monitor inicializado');
    },
    
    /**
     * Heartbeat para detectar desconexões
     */
    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        // Verificar conexão a cada 10 segundos
        this.heartbeatInterval = setInterval(() => {
            this.checkConnection();
        }, 10000);
        
        // Primeira verificação imediata
        this.checkConnection();
    },
    
    /**
     * Atualizar UI quando status muda
     */
    updateUI() {
        if (typeof atualizarStatusNaoSalvasHUD === 'function') {
            atualizarStatusNaoSalvasHUD();
        }
    },
    
    /**
     * Verificar se está conectado ao Supabase
     */
    async checkConnection() {
        try {
            const supabase = window.supabase;
            if (!supabase) {
                this.isConnectedToSupabase = false;
                return;
            }
            
            const { data, error } = await Promise.race([
                supabase.auth.getSession(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 5000)
                )
            ]);
            
            if (error || !data?.session) {
                throw new Error('Session lost');
            }
            
            const wasDisconnected = !this.isConnectedToSupabase;
            this.isConnectedToSupabase = true;
            this.reconnectAttempts = 0;
            this.lastSuccessfulSync = new Date();
            
            // Atualizar UI
            this.updateUI();
            
            // Se voltou online após desconexão, sincronizar
            if (wasDisconnected && this.onConnectionRestored) {
                console.log('🔄 Conexão restaurada - disparando sincronização...');
                this.onConnectionRestored();
            }
            
        } catch (error) {
            const wasConnected = this.isConnectedToSupabase;
            this.isConnectedToSupabase = false;
            
            // Atualizar UI
            this.updateUI();
            
            // Se perdeu conexão recentemente
            if (wasConnected && this.onConnectionLost) {
                console.log('❌ Conexão perdida:', error.message);
                this.onConnectionLost();
            }
            
            // Tentar reconectar
            this.attemptReconnect();
        }
    },
    
    /**
     * Tentar reconectar ao Supabase
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('❌ Máximo de tentativas de reconexão atingido');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Backoff exponencial
        
        console.log(`🔄 Tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay}ms...`);
        
        setTimeout(() => {
            this.checkConnection();
        }, delay);
    },
    
    /**
     * Handle quando voltar online
     */
    handleOnline() {
        console.log('🌐 Navegador online');
        this.isOnline = true;
        this.reconnectAttempts = 0;
        
        // Atualizar UI
        this.updateUI();
        
        // Verificar conexão com Supabase imediatamente
        this.checkConnection();
    },
    
    /**
     * Handle quando ficar offline
     */
    handleOffline() {
        console.log('📴 Navegador offline');
        this.isOnline = false;
        this.isConnectedToSupabase = false;
        
        // Atualizar UI
        this.updateUI();
        
        if (this.onConnectionLost) {
            this.onConnectionLost();
        }
    },
    
    /**
     * Handle antes de descarregar página (F5, fechar, etc)
     */
    handleBeforeUnload(event) {
        // Verificar se há alterações não salvas
        if (window.alteracoesNaoSalvas) {
            console.log('⚠️ Alterações não salvas detectadas - tentando salvar...');
            
            // Forçar salvamento síncrono se possível
            const savedData = this.captureDataBeforeUnload();
            if (savedData) {
                // Salvar em localStorage como backup
                localStorage.setItem('pendingSave', JSON.stringify({
                    data: savedData,
                    timestamp: new Date().toISOString(),
                    periodo: window.mesSelecionado && window.anoSelecionado 
                        ? `${window.mesSelecionado}-${window.anoSelecionado}`
                        : null
                }));
                
                console.log('💾 Dados salvos em localStorage como backup');
            }
            
            // Tentar salvar de forma assíncrona
            if (typeof saveDashboardToSupabase === 'function') {
                try {
                    const savePromise = saveDashboardToSupabase(true);
                    
                    // Aguardar um pouco antes de descarregar
                    event.preventDefault();
                    
                    savePromise.then(() => {
                        console.log('✅ Dados salvos antes de descarregar');
                        window.location.reload(true);
                    }).catch((err) => {
                        console.log('⚠️ Falha ao salvar:', err);
                        window.location.reload(true);
                    });
                    
                    return;
                } catch (err) {
                    console.log('⚠️ Erro ao tentar salvar:', err);
                }
            }
        }
    },
    
    /**
     * Capturar dados antes de descarregar
     */
    captureDataBeforeUnload() {
        try {
            if (typeof collectDashboardData === 'function') {
                return collectDashboardData();
            }
        } catch (error) {
            console.error('Erro ao capturar dados:', error);
        }
        return null;
    },
    
    /**
     * Restaurar dados de backup se necessário
     */
    async restoreFromBackup() {
        const pendingSave = localStorage.getItem('pendingSave');
        if (!pendingSave) return false;
        
        try {
            const backup = JSON.parse(pendingSave);
            const now = new Date();
            const backupTime = new Date(backup.timestamp);
            
            // Usar backup se foi criado nos últimos 30 minutos
            if (now - backupTime < 30 * 60 * 1000) {
                console.log('🔄 Restaurando dados de backup...');
                
                // Aplicar dados ao interface
                if (typeof applyDashboardData === 'function' && backup.data) {
                    applyDashboardData(backup.data);
                }
                
                // Tentar salvar no Supabase
                if (typeof saveDashboardToSupabase === 'function') {
                    await saveDashboardToSupabase(true);
                }
                
                // Limpar backup
                localStorage.removeItem('pendingSave');
                console.log('✅ Dados restaurados e sincronizados');
                return true;
            }
        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
        }
        
        return false;
    },
    
    /**
     * Obter status
     */
    getStatus() {
        return {
            isOnline: this.isOnline,
            isConnectedToSupabase: this.isConnectedToSupabase,
            lastSuccessfulSync: this.lastSuccessfulSync,
            reconnectAttempts: this.reconnectAttempts,
            hasPendingData: !!localStorage.getItem('pendingSave')
        };
    }
};

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    ConnectionMonitor.init();
});

console.log('✅ connection-monitor.js pronto');
