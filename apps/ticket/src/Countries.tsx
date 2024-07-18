import { useEffect, useCallback,useState } from "react";
import { createClient } from "@supabase/supabase-js";


const supabaseUrl = 'https://lkeoolxvzgdecjewboiz.supabase.co'
const supabaseApiKey = import.meta.env.VITE_SUPA_LAB_API_KEY;

const supabase = createClient(supabaseUrl, supabaseApiKey);

type CountryRec    = {id:number, name:string,};
type CountrySelect = {data:CountryRec[]};

export const Countries = () => {
  const [countries, setCountries] = useState<CountryRec[]>([]);

  const getCountries = useCallback(async () => {
    const { data } = await supabase.from("countries").select() as CountrySelect;
    setCountries(data);
  }, []);

  return (
  <div>
    <button onClick={getCountries}>Get Countries</button>
    <ul>
      {countries.map((country) => <li key={country.id}>{country.name}</li>)}
    </ul>
  </div>
  );
};

