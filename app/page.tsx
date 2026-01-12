'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';

type Barber = { id: string; name: string };
type Service = { id: string; name: string; duration_minutes: number; price_cents: number };
type Appointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  client_name: string;
  status: 'scheduled' | 'cancelled' | 'done';
  service?: { name: string; duration_minutes: number };
};

const TZ = 'America/Sao_Paulo';

export default function Page() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [barberId, setBarberId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));

  const selectedService = useMemo(
    () => services.find(s => s.id === serviceId),
    [services, serviceId]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: b }, { data: s }] = await Promise.all([
        supabase.from('barbers').select('id,name').eq('active', true).order('name', { ascending: true }),
        supabase.from('services').select('id,name,duration_minutes,price_cents').eq('active', true).order('duration_minutes', { ascending: true })
      ]);
      setBarbers(b || []);
      setServices(s || []);
      setBarberId(b?.[0]?.id || '');
      setServiceId(s?.[0]?.id || '');
      setLoading(false);
    })();
  }, []);

  async function loadAgenda() {
    if (!barberId) return;
    const from = fromZonedTime(`${day}T00:00:00`, TZ).toISOString();
    const to   = fromZonedTime(`${day}T23:59:59`, TZ).toISOString();
    const { data, error } = await supabase
      .from('appointments')
      .select('id, starts_at, ends_at, client_name, status, service:service_id(name, duration_minutes)')
      .eq('barber_id', barberId)
      .gte('starts_at', from)
      .lte('starts_at', to)
      .order('starts_at', { ascending: true });

    if (!error) setAppointments((data || []) as any);
  }

  async function updateStatus(id: string, status: 'done' | 'cancelled') {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) return alert('Erro ao atualizar: ' + error.message);
    await loadAgenda();
  }

  useEffect(() => {
    loadAgenda();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberId, day]);

  async function handleCreate() {
    if (!barberId || !serviceId || !selectedService) return alert('Selecione barbeiro e serviço.');
    if (!clientName.trim()) return alert('Informe o nome do cliente.');

    const abre = 9, fecha = 18;
    const [h, m] = time.split(':').map(Number);
    if (h < abre || (h >= fecha && m > 0)) {
      return alert('Funcionamento: 09:00 às 18:00');
    }

    const startsAtUtc = fromZonedTime(`${date}T${time}:00`, TZ).toISOString();

    const { error } = await supabase
      .from('appointments')
      .insert([{
        barber_id: barberId,
        service_id: serviceId,
        client_name: clientName,
        client_phone: clientPhone,
        starts_at: startsAtUtc,
        duration_minutes: selectedService.duration_minutes
      }]);

    if (error) {
      if (error.message?.includes('appointments_no_overlap')) {
        alert('Este horário já está ocupado para o barbeiro selecionado.');
      } else {
        alert('Erro ao agendar: ' + error.message);
      }
      return;
    }
    alert('Agendamento criado!');
    setClientName('');
    setClientPhone('');
    await loadAgenda();
  }

  function fmtLocal(ts: string) {
    return formatInTimeZone(ts, TZ, 'dd/MM/yyyy HH:mm');
  }

  if (loading) return <main style={{ padding: 24 }}>Carregando…</main>;

  return (
    <main style={{ padding: 24, display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }}>
      <section>
        <h2>Agendar</h2>
        <div style={{ display: 'grid', gap: 12, maxWidth: 460, marginTop: 12 }}>
          <label>Barbeiro
            <select value={barberId} onChange={e => setBarberId(e.target.value)}>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label>Serviço
            <select value={serviceId} onChange={e => setServiceId(e.target.value)}>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} — {s.duration_minutes}min</option>)}
            </select>
          </label>
          <label>Cliente
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nome do cliente" />
          </label>
          <label>Telefone
            <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="51900000000" />
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label>Data
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </label>
            <label>Hora
              <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </label>
          </div>
          <button onClick={handleCreate}>Criar agendamento</button>
        </div>
      </section>

      <section>
        <h2>Agenda do dia</h2>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <input type="date" value={day} onChange={e => setDay(e.target.value)} />
          <button onClick={loadAgenda}>Atualizar</button>
        </div>
        <ul style={{ marginTop: 12, padding: 0, listStyle: 'none' }}>
          {appointments.map(a => (
            <li key={a.id} style={{ padding: 8, border: '1px solid #ddd', marginBottom: 8 }}>
              <b>{a.service?.name}</b> — {fmtLocal(a.starts_at)} → {fmtLocal(a.ends_at)}<br />
              Cliente: {a.client_name} — Status: {a.status}
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button disabled={a.status !== 'scheduled'} onClick={() => updateStatus(a.id, 'done')}>
                  Concluir
                </button>
                <button disabled={a.status !== 'scheduled'} onClick={() => updateStatus(a.id, 'cancelled')}>
                  Cancelar
                </button>
              </div>
            </li>
          ))}
          {appointments.length === 0 && <p>Sem agendamentos para o dia.</p>}
        </ul>
      </section>
    </main>
  );
}
