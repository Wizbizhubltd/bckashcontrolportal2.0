import { useCallback, useEffect, useState } from 'react';
import { locationsApi, type City, type Lga, type State } from '../api/locationsApi';
import { zonesApi, type Zone } from '../api/zonesApi';

/**
 * Options for the cascading State → LGA → City dropdowns, plus zones. LGAs load for the chosen
 * state and cities for the chosen LGA (or, with no LGA chosen, for the whole state).
 */
export function useLocationOptions(stateId: number | undefined, lgaId: number | undefined) {
  const [states, setStates] = useState<State[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [lgas, setLgas] = useState<Lga[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  useEffect(() => {
    void locationsApi.states().then(setStates).catch(() => undefined);
    void zonesApi.list().then(setZones).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!stateId) {
      setLgas([]);
      return;
    }
    void locationsApi.lgas(stateId).then(setLgas).catch(() => undefined);
  }, [stateId]);

  const reloadCities = useCallback(async () => {
    if (!stateId && !lgaId) {
      setCities([]);
      return;
    }
    try {
      setCities(await locationsApi.cities(lgaId ? { lgaId } : { stateId }));
    } catch {
      setCities([]);
    }
  }, [stateId, lgaId]);

  useEffect(() => {
    void reloadCities();
  }, [reloadCities]);

  return { states, lgas, cities, zones, reloadCities };
}
