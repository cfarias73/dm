import unittest

from backend.app.agents.pipeline import (
    prospect_band,
    score_prospect,
    has_category_evidence,
    has_business_evidence,
    has_location_evidence,
    is_blocked_source,
    is_likely_official_site,
)


class PipelineValidationTests(unittest.TestCase):
    def test_blocks_non_business_sources(self):
        self.assertTrue(is_blocked_source("https://www.youtube.com/watch?v=test"))
        self.assertTrue(is_blocked_source("https://example.edu/file.pdf"))
        self.assertTrue(is_blocked_source("https://maps.apple.com/place"))

    def test_requires_business_evidence(self):
        self.assertTrue(has_business_evidence("Pizzeria Roma", "Pizzeria Roma Guadalajara"))
        self.assertFalse(has_business_evidence("Pizzeria Roma", "Hotel en Guadalajara"))

    def test_detects_category(self):
        self.assertTrue(has_category_evidence("Pizzerias", "Pizza artesanal y horno de leña"))
        self.assertFalse(has_category_evidence("Pizzerias", "Hotel boutique con spa"))

    def test_rejects_editorial_domain_as_official_site(self):
        self.assertFalse(
            is_likely_official_site(
                "Pizzeria La Piazza",
                "thelosangelesbeat.com",
                "Articulo sobre una pizzeria en Guadalajara",
            )
        )
        self.assertTrue(
            is_likely_official_site(
                "Pizzeria Capri",
                "capripizzasubs.com",
                "Menu, contacto y delivery de Pizzeria Capri",
            )
        )

    def test_requires_location_context(self):
        self.assertTrue(has_location_evidence("Guadalajara", "Dirección: Av. Vallarta, Guadalajara"))
        self.assertFalse(has_location_evidence("Guadalajara", "Artículo sobre restaurantes en Guadalajara"))

    def test_prospect_bands_follow_client_thresholds(self):
        self.assertEqual(prospect_band(0), "Lead")
        self.assertEqual(prospect_band(40), "Qualified Lead")
        self.assertEqual(prospect_band(60), "Prospect")
        self.assertEqual(prospect_band(80), "Hot Prospect")

    def test_prospect_score_keeps_commercial_dimensions(self):
        result = score_prospect({
            "name": "Pizzeria Capri",
            "raw_content": "Pizzeria Capri Guadalajara menú, contacto, servicio corporativo y sucursales.",
            "research_notes": "Empresa con necesidad de eventos y clientes corporativos.",
            "location_verified": True,
            "business_category_verified": True,
            "domain_verified": True,
            "contact_verified": True,
            "email_verified": True,
        }, None, intent_score=80)
        self.assertEqual(result["fit_score"], 100)
        self.assertEqual(result["intent_score"], 80)
        self.assertGreaterEqual(result["prospect_score"], 60)
        self.assertIn(result["prospect_band"], {"Prospect", "Hot Prospect"})


if __name__ == "__main__":
    unittest.main()
