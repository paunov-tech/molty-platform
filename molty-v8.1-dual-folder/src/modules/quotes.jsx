import { C, fe } from "../core/theme.js";
import { Card, Input, SectionTitle } from "../core/ui.jsx";
import { useCustomers } from "../core/store.js";

export default function Quotes({ quoteItems, setQuoteItems }) {
  const customers = useCustomers();
  const [qCust, setQCust] = [quoteItems._customer || "", (v) => setQuoteItems(prev => ({...prev, _customer: v}))];
  const items = quoteItems.items || [];

  return <Card>
    <SectionTitle>Nova ponuda</SectionTitle>
    <select value={qCust} onChange={e => setQCust(e.target.value)} style={{width:"100%",padding:"7px 10px",borderRadius:6,border:`1px solid ${C.brd}`,background:C.sf,color:C.tx,fontSize:11,marginBottom:10}}>
      <option value="">Izaberi kupca...</option>
      {customers.map(c => <option key={c.id} value={c.name}>{c.flag} {c.name}</option>)}
    </select>
    {items.length === 0 ?
      <div style={{textAlign:"center",padding:16,color:C.txD,fontSize:11}}>Idi na Materijali → "+Ponuda" da dodaš stavke</div> :
      <div>
        {items.map((qi, i) => (
          <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${C.brd}`}}>
            <div style={{flex:1}}><div style={{fontSize:11,fontWeight:500}}>{qi.name}</div><div style={{fontSize:8,color:C.txD}}>{qi.code}</div></div>
            <Input type="number" value={qi.qty} min={0.1} step={0.1} onChange={e => {
              const n = [...items]; n[i] = {...n[i], qty: parseFloat(e.target.value)||0};
              setQuoteItems(prev => ({...prev, items: n}));
            }} style={{width:60,textAlign:"center"}}/>
            <div style={{fontSize:11,minWidth:70,textAlign:"right"}}>{fe(qi.price)}/{qi.unit}</div>
            <div style={{fontSize:11,fontWeight:700,color:C.or,minWidth:60,textAlign:"right"}}>{fe(Math.round(qi.price * qi.qty))}</div>
            <button onClick={() => setQuoteItems(prev => ({...prev, items: items.filter((_,j) => j !== i)}))} style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:14}}>×</button>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",marginTop:6,borderTop:`2px solid ${C.or}`}}>
          <span style={{fontSize:12,fontWeight:700}}>UKUPNO</span>
          <span style={{fontSize:18,fontWeight:800,color:C.or}}>{fe(items.reduce((s, qi) => s + qi.price * qi.qty, 0))}</span>
        </div>
      </div>
    }
  </Card>;
}
