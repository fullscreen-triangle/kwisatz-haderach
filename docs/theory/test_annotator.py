import pytest
import pandas as pd
import numpy as np
from ..annotation.MSAnnotator import MSAnnotator, AnnotationParameters


@pytest.fixture
def annotator():
    params = AnnotationParameters()
    return MSAnnotator(params)


def test_search_by_formula(annotator):
    result = annotator.search_by_formula("C6H12O6")
    assert isinstance(result, pd.DataFrame)
    assert len(result) > 0
    assert 'compound_id' in result.columns
    assert 'formula' in result.columns


def test_search_by_name(annotator):
    result = annotator.search_by_name("glucose")
    assert isinstance(result, pd.DataFrame)
    assert len(result) > 0
    assert 'compound_id' in result.columns
    assert 'iupac_name' in result.columns


def test_calculate_isotope_pattern(annotator):
    result = annotator.calculate_isotope_pattern("C6H12O6")
    assert isinstance(result, pd.DataFrame)
    assert len(result) > 0
    assert 'mass' in result.columns
    assert 'abundance' in result.columns


def test_predict_rt(annotator):
    rt = annotator.predict_rt("CC(=O)O")  # Acetic acid
    assert isinstance(rt, float)
    assert rt >= 0


def test_fragment_prediction(annotator):
    fragments = annotator.fragment_prediction("CC(=O)O")
    assert isinstance(fragments, list)
    assert len(fragments) > 0
    assert all('smiles' in f for f in fragments)
    assert all('mass' in f for f in fragments)


def test_combine_results(annotator):
    lipidmaps_df = pd.DataFrame({
        'compound_id': [1],
        'formula': ['C6H12O6'],
        'exact_mass': [180.0634],
        'source': ['LipidMaps']
    })

    result = annotator._combine_results(lipidmaps_df)
    assert isinstance(result, pd.DataFrame)
    assert len(result) > 0
    assert 'confidence_score' in result.columns


def test_invalid_formula(annotator):
    result = annotator.search_by_formula("InvalidFormula")
    assert isinstance(result, pd.DataFrame)
    assert len(result) == 0


def test_invalid_name(annotator):
    result = annotator.search_by_name("ThisCompoundDoesNotExist12345")
    assert isinstance(result, pd.DataFrame)
    assert len(result) == 0


def test_invalid_smiles(annotator):
    rt = annotator.predict_rt("InvalidSMILES")
    assert rt is None


def test_batch_processing():
    params = AnnotationParameters(batch_size=2)
    annotator = MSAnnotator(params)

    spectra = [
        {'precursor_mz': 180.0634},
        {'precursor_mz': 342.1162},
        {'precursor_mz': 256.0845}
    ]

    result = annotator.annotate(spectra)
    assert isinstance(result, pd.DataFrame)
    assert len(result) > 0


def test_parameter_validation():
    with pytest.raises(ValueError):
        AnnotationParameters(ms1_ppm_tolerance=-1.0)

    with pytest.raises(ValueError):
        AnnotationParameters(batch_size=0)


def test_similarity_calculation():
    params = AnnotationParameters()
    annotator = MSAnnotator(params)

    spec1 = {'peaks': [(100, 999), (200, 888)]}
    spec2 = {'peaks': [(100, 999), (200, 888)]}

    similarity = annotator.cosine_similarity(spec1, spec2)
    assert isinstance(similarity, float)
    assert 0 <= similarity <= 1
