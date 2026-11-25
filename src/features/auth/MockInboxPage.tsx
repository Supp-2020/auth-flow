import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../../components/AuthLayout'
import { mailbox, syncDb } from '../../mocks/db'

/** Learning aid only: shows the fake outbox. A real app has no such page. */
export function MockInboxPage() {
  const { data } = useQuery({ queryKey: ['mock-inbox'], queryFn: () => { syncDb(); return [...mailbox] }, refetchInterval: 1500 })
  return (
    <AuthLayout>
      <div className="stack">
        <div>
          <h1 className="page-title">Mock inbox</h1>
          <p className="page-sub">Fake emails sent by the mock API. Not part of a real app.</p>
        </div>
        {!data?.length && <p className="page-sub">No messages yet.</p>}
        <ul className="list">
          {data?.map((m) => (
            <li key={m.id}>
              <strong>{m.subject}</strong> <span className="demo">to {m.to}</span>
              <br /><Link to={m.link}>Open link</Link>
            </li>
          ))}
        </ul>
        <p className="fineprint"><Link className="link" to="/login">Back to sign in</Link></p>
      </div>
    </AuthLayout>
  )
}
