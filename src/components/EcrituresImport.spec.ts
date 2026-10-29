import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EcrituresImport from './EcrituresImport.vue'
import { importEcritures } from '../services/comptabiliteService'
import type { ImportReport } from '../types/comptabilite'

vi.mock('../services/comptabiliteService', () => ({ importEcritures: vi.fn() }))

const mockImport = vi.mocked(importEcritures)
const report: ImportReport = {
  importId: 4,
  fichier: 'ecritures-exemple.csv',
  lignesLues: 20,
  lignesImportees: 15,
  lignesRejetees: 3,
  doublons: 2,
  piecesImportees: 6,
  piecesRejetees: 1,
  erreurs: [],
}

async function selectFile(wrapper: ReturnType<typeof mount>, file = new File(['date;…'], 'ecritures.csv', { type: 'text/csv' })) {
  const input = wrapper.get<HTMLInputElement>('#import-file')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  return file
}

beforeEach(() => {
  vi.clearAllMocks()
  mockImport.mockResolvedValue(report)
})

describe('EcrituresImport', () => {
  it('importe dès qu’un fichier est choisi et transmet le rapport', async () => {
    const wrapper = mount(EcrituresImport)
    const file = await selectFile(wrapper)
    await flushPromises()

    expect(mockImport).toHaveBeenCalledWith(file)
    expect(wrapper.emitted('completed')).toEqual([[report]])
  })

  it('transmet aussi le rapport quand rien n’a été importé', async () => {
    const vide = { ...report, importId: null, lignesImportees: 0 }
    mockImport.mockResolvedValue(vide)
    const wrapper = mount(EcrituresImport)

    await selectFile(wrapper)
    await flushPromises()

    expect(wrapper.emitted('completed')).toEqual([[vide]])
  })

  it('accepte un fichier glissé-déposé', async () => {
    const wrapper = mount(EcrituresImport)
    const file = new File(['date;…'], 'depose.csv', { type: 'text/csv' })

    await wrapper.get('.dropzone').trigger('drop', { dataTransfer: { files: [file] } })
    await flushPromises()

    expect(mockImport).toHaveBeenCalledWith(file)
  })

  it('affiche l’erreur du serveur (fichier déjà importé)', async () => {
    mockImport.mockRejectedValue(new Error('Ce fichier a déjà été importé le 28 octobre 2026.'))
    const wrapper = mount(EcrituresImport)

    await selectFile(wrapper)
    await flushPromises()

    expect(wrapper.get('.import-error').text()).toBe('Ce fichier a déjà été importé le 28 octobre 2026.')
    expect(wrapper.emitted('completed')).toBeUndefined()
  })
})
