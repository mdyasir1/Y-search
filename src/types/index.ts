export interface District {
  id: string
  name: string
  nameTelugu: string
}

export interface Assembly {
  id: string
  name: string
  nameTelugu: string
}

export interface PollingStation {
  id: string
  name: string
  nameTelugu: string
}

export interface VoterRecord {
  serial: string
  house: string
  name: string
  rel_type: string
  rel_name: string
  gender: string
  age: string
  epic: string
  part: string
  ac_name: string
  district: string
}
