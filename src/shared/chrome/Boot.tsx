import { ActionButton } from '../ui';
import './boot.css';

interface BootProps {
  status: 'loading' | 'error';
  message: string | null;
  onRetry: () => void;
}

/**
 * Tela de partida. Sem catálogo e sem sessão não há experiência — e se a API
 * não responder, o motivo aparece aqui em vez de virar uma página em branco.
 */
export function Boot({ status, message, onRetry }: BootProps) {
  const isError = status === 'error';

  return (
    <div className="boot" role="status" aria-live="polite">
      <div className="app__grain" aria-hidden="true" />

      <div className="boot__inner">
        <span className={`boot__mark${isError ? ' boot__mark--error' : ''}`} aria-hidden="true" />

        <p className="boot__brand">
          Atelier<span>Noir</span>
        </p>

        {isError ? (
          <>
            <h1 className="boot__title">A API não respondeu</h1>
            <p className="boot__message">{message}</p>

            <div className="boot__hint">
              <p className="boot__hint-label">Suba o servidor e o front juntos:</p>
              <code className="boot__code">npm run dev</code>
              <p className="boot__hint-note">
                A API sobe em <strong>localhost:3333</strong> e o front em <strong>localhost:5180</strong>.
                Para conferir só a API, abra <strong>/api/health</strong>.
              </p>
            </div>

            <ActionButton onClick={onRetry} data-cursor-label="Tentar">
              Tentar de novo
            </ActionButton>
          </>
        ) : (
          <>
            <h1 className="boot__title">Abrindo o ateliê</h1>
            <p className="boot__message">Buscando o catálogo e a sua sessão…</p>
          </>
        )}
      </div>
    </div>
  );
}
