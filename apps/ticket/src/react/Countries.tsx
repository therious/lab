import { useEffect, useCallback,useState } from "react";
import { createClient } from "@supabase/supabase-js";


const supabaseUrl = import.meta.env.VITE_SUPA_URL;
const supabaseApiKey = import.meta.env.VITE_SUPA_ANON_KEY;

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

