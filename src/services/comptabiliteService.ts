import { apiClient, toRequestError } from './api'
import type { Balance, Ecriture, ImportReport, Lettrage } from '../types/comptabilite'

export async function importEcritures(file: File): Promise<ImportReport> {
  const formData = new FormData()
  formData.append('fichier', file)

  try {
    const response = await apiClient.post<{ data: ImportReport }>('/api/comptabilite/imports', formData, {
      timeout: 30000,
    })
    return response.data.data
  } catch (error: unknown) {
    throw toRequestError(error, 'L’import du fichier a échoué.')
  }
}

export async function getBalance(): Promise<Balance> {
  try {
    const response = await apiClient.get<{ data: Balance }>('/api/comptabilite/balance')
    return response.data.data
  } catch (error: unknown) {
    throw toRequestError(error, 'Impossible de récupérer la balance.')
  }
}

export async function getJournal(): Promise<Ecriture[]> {
  try {
    const response = await apiClient.get<{ data: Ecriture[] }>('/api/comptabilite/ecritures')
    return response.data.data
  } catch (error: unknown) {
    throw toRequestError(error, 'Impossible de récupérer le journal.')
  }
}

export async function getEcrituresCompte(compte: string): Promise<Ecriture[]> {
  try {
    const response = await apiClient.get<{ data: Ecriture[] }>('/api/comptabilite/ecritures', {
      params: { compte },
    })
    return response.data.data
  } catch (error: unknown) {
    throw toRequestError(error, 'Impossible de récupérer les écritures du compte.')
  }
}

export async function lettrer(ecritureIds: number[]): Promise<Lettrage> {
  try {
    const response = await apiClient.post<{ data: Lettrage }>('/api/comptabilite/lettrages', { ecritureIds })
    return response.data.data
  } catch (error: unknown) {
    throw toRequestError(error, 'Le lettrage a échoué.')
  }
}

export async function delettrer(compte: string, code: string): Promise<void> {
  try {
    await apiClient.delete(`/api/comptabilite/lettrages/${encodeURIComponent(compte)}/${encodeURIComponent(code)}`)
  } catch (error: unknown) {
    throw toRequestError(error, 'Le délettrage a échoué.')
  }
}
