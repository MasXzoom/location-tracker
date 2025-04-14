import { supabase } from '../lib/supabase'
import { Location } from '../lib/geo'

export interface TrackingData extends Location {
  tracking_code: string
  user_agent: string
}

export const saveTrackingData = async (data: TrackingData) => {
  const { error } = await supabase
    .from('tracking_logs')
    .insert([data])

  if (error) {
    throw error
  }
} 