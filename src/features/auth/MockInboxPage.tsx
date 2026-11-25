import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { mailbox } from '../../mocks/db'

/** Learning aid only: shows the fake outbox. A real app has no such page. */
export function MockInboxPage() {
  const { data } = useQuery({ queryKey: ['mock-inbox'], queryFn: () => [...mailbox], refetchInterval: 1500 })
  return (
    <main className="card">
      <h1>Mock inbox</h1>
      <p className="demo">Fake emails sent by the mock API. Not part of a real app.</p>
      {!data?.length && <p>No messages yet.</p>}
      <ul className="inbox">
        {data?.map((m) => (
          <li key={m.id}>
            <strong>{m.subject}</strong> <span className="demo">to {m.to}</span>
            <br /><Link to={m.link}>Open link</Link>
          </li>
        ))}
      </ul>
      <p className="links"><Link to="/login">Back to log in</Link></p>
    </main>
  )
}
